package com.gu.productmove.endpoint.move

import com.gu.effects.GetFromS3
import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Annual, BillingPeriod, Monthly, PricesFromZuoraCatalog}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  ErrorResponse,
  ExpectedInput,
  InternalServerError,
  OutputBody,
  PreviewResult,
  Success,
}
import com.gu.productmove.move.BuildPreviewResult
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.{
  AddRatePlan,
  ChargeOverrides,
  CreatePayment,
  CreatePaymentResponse,
  GetAccount,
  GetAccountLive,
  GetInvoice,
  GetInvoiceItems,
  GetSubscription,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  RemoveRatePlan,
  Subscribe,
  SubscribeLive,
  SubscriptionUpdate,
  SubscriptionUpdateInvoice,
  SubscriptionUpdateInvoiceItem,
  SubscriptionUpdateLive,
  SubscriptionUpdatePreviewResponse,
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
  SwitchProductUpdateRequest,
  TermRenewal,
  UpdateSubscriptionAmount,
  ZuoraCancel,
  ZuoraCancelLive,
  given_JsonDecoder_SubscriptionUpdatePreviewResponse,
  given_JsonDecoder_SubscriptionUpdateResponse,
}
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  Dynamo,
  DynamoLive,
  EmailMessage,
  EmailPayload,
  EmailPayloadContactAttributes,
  GuStageLive,
  RCtoSPEmailPayloadProductSwitchAttributes,
  SQS,
  SQSLive,
  SttpClientLive,
}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.util.config
import com.gu.util.config.ZuoraEnvironment
import zio.*
import zio.json.*

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

case class SupporterPlusRatePlanIds(
    ratePlanId: String,
    subscriptionRatePlanChargeId: String,
    contributionRatePlanChargeId: String,
)
case class RecurringContributionRatePlanIds(
    ratePlanChargeId: String,
)

case class ProductSwitchRatePlanIds(
    supporterPlusRatePlanIds: SupporterPlusRatePlanIds,
    recurringContributionRatePlanIds: RecurringContributionRatePlanIds,
)

object RecurringContributionToSupporterPlus {

  private def getSingleOrNotEligible[A](list: List[A], message: String): IO[ErrorResponse, A] =
    list.length match {
      case 1 => ZIO.succeed(list.head)
      case _ => ZIO.fail(InternalServerError(message))
    }

  def apply(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
  ): ZIO[
    GetSubscription
      with SubscriptionUpdate
      with TermRenewal
      with GetInvoiceItems
      with GetInvoice
      with CreatePayment
      with InvoiceItemAdjustment
      with GetAccount
      with SQS
      with Dynamo
      with Stage,
    ErrorResponse,
    OutputBody,
  ] = {
    (for {
      _ <- ZIO.log("RecurringContributionToSupporterPlus PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName)

      currentRatePlan <- getSingleOrNotEligible(
        subscription.ratePlans.filterNot(_.lastChangeType.contains("Remove")),
        s"Subscription: ${subscriptionName.value} has more than one active ratePlan",
      )
      ratePlanCharge <- getSingleOrNotEligible(
        currentRatePlan.ratePlanCharges,
        s"Subscription: ${subscriptionName.value} has more than one ratePlanCharge",
      )
      currency <- ZIO
        .fromOption(ratePlanCharge.currencyObject)
        .orElseFail(
          InternalServerError(
            s"Missing or unknown currency ${ratePlanCharge.currency} on rate plan charge in rate plan ${currentRatePlan.id} ",
          ),
        )

      result <-
        if (postData.preview)
          doPreview(
            SubscriptionName(subscription.id),
            postData.price,
            ratePlanCharge.billingPeriod,
            ratePlanCharge,
            currency,
            currentRatePlan.id,
          )
        else
          doUpdate(
            subscriptionName,
            postData.price,
            postData.checkChargeAmountBeforeUpdate,
            BigDecimal(ratePlanCharge.price.get),
            ratePlanCharge,
            currency,
            currentRatePlan,
            subscription,
            postData.csrUserId,
            postData.caseId,
          )
    } yield result).fold(error => error, success => success)
  }

  private def getProductSwitchRatePlanIds(
      stage: Stage,
      billingPeriod: BillingPeriod,
  ): Either[ErrorResponse, ProductSwitchRatePlanIds] = {
    zuoraIdsForStage(config.Stage(stage.toString)).left
      .map(err => InternalServerError(err))
      .flatMap { zuoraIds =>
        import zuoraIds.supporterPlusZuoraIds.{annualV2, monthlyV2}
        import zuoraIds.contributionsZuoraIds.{annual, monthly}

        billingPeriod match {
          case Monthly =>
            Right(
              ProductSwitchRatePlanIds(
                SupporterPlusRatePlanIds(
                  monthlyV2.productRatePlanId.value,
                  monthlyV2.productRatePlanChargeId.value,
                  monthlyV2.contributionProductRatePlanChargeId.value,
                ),
                RecurringContributionRatePlanIds(monthly.productRatePlanChargeId.value),
              ),
            )
          case Annual =>
            Right(
              ProductSwitchRatePlanIds(
                SupporterPlusRatePlanIds(
                  annualV2.productRatePlanId.value,
                  annualV2.productRatePlanChargeId.value,
                  annualV2.contributionProductRatePlanChargeId.value,
                ),
                RecurringContributionRatePlanIds(annual.productRatePlanChargeId.value),
              ),
            )
          case _ => Left(InternalServerError(s"Error when matching on billingPeriod $billingPeriod"))
        }
      }
  }

  private def getSubscriptionPriceInMinorUnits(
      stage: Stage,
      catalogPlanId: PlanId,
      currency: Currency,
  ): Either[String, AmountMinorUnits] =
    for {
      ratePlanToApiId <- zuoraIdsForStage(config.Stage(stage.toString)).map(_.rateplanIdToApiId)
      prices <- PricesFromZuoraCatalog(
        ZuoraEnvironment(stage.toString),
        GetFromS3.fetchString,
        ratePlanToApiId.get,
      ).toDisjunction.left.map(_.message)
    } yield prices(catalogPlanId)(currency)

  private def getContributionAmount(
      stage: Stage,
      price: BigDecimal,
      currency: Currency,
      billingPeriod: BillingPeriod,
  ): IO[ErrorResponse, BigDecimal] =
    // work out how much of what the user is paying can be treated as a contribution (total amount - cost of sub)
    val catalogPlanId =
      if (billingPeriod == Monthly)
        MonthlySupporterPlus
      else
        AnnualSupporterPlus
    ZIO
      .fromEither(
        getSubscriptionPriceInMinorUnits(stage, catalogPlanId, currency)
          .map(subscriptionChargePrice => price - (subscriptionChargePrice.value / 100)),
      )
      .mapError(x => InternalServerError(x))

  def getRatePlans(
      billingPeriod: BillingPeriod,
      currency: Currency,
      ratePlanIdToRemove: String,
      price: BigDecimal,
  ): ZIO[Stage, ErrorResponse, (List[AddRatePlan], List[RemoveRatePlan])] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
      stage <- ZIO.service[Stage]
      productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(stage, billingPeriod))
      overrideAmount <- getContributionAmount(stage, price, currency, billingPeriod)
      chargeOverride = ChargeOverrides(
        price = Some(overrideAmount),
        productRatePlanChargeId = productSwitchRatePlanIds.supporterPlusRatePlanIds.contributionRatePlanChargeId,
      )
      addRatePlan = AddRatePlan(
        date,
        productSwitchRatePlanIds.supporterPlusRatePlanIds.ratePlanId,
        chargeOverrides = List(chargeOverride),
      )
      removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
    } yield (List(addRatePlan), List(removeRatePlan))

  private def doPreview(
      subscriptionName: SubscriptionName,
      price: BigDecimal,
      billingPeriod: BillingPeriod,
      activeRatePlanCharge: RatePlanCharge,
      currency: Currency,
      currentRatePlanId: String,
  ): ZIO[SubscriptionUpdate with Stage, ErrorResponse, OutputBody] = for {
    _ <- ZIO.log("Fetching Preview from Zuora")

    today <- Clock.currentDateTime.map(_.toLocalDate)

    updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
      case (addRatePlan, removeRatePlan) =>
        SwitchProductUpdateRequest(
          add = addRatePlan,
          remove = removeRatePlan,
          preview = Some(true),
          targetDate = Some(today.plusMonths(13)),
          currentTerm = Some("24"),
          currentTermPeriodType = Some("Month"),
        )
    }

    response <- SubscriptionUpdate
      .update[SubscriptionUpdatePreviewResponse](subscriptionName, updateRequestBody)

    stage <- ZIO.service[Stage]
    productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(stage, billingPeriod))
    previewResult <- BuildPreviewResult.getPreviewResult(
      subscriptionName,
      activeRatePlanCharge,
      response.invoice,
      productSwitchRatePlanIds,
    )
  } yield previewResult

  /*
     This function is used to adjust the invoice item for the subscription charge
   */
  private def adjustNonCollectedInvoice(
      invoiceId: String,
      billingPeriod: BillingPeriod,
      subscriptionName: SubscriptionName,
      balanceToAdjust: BigDecimal,
  ): ZIO[InvoiceItemAdjustment with GetInvoiceItems with Stage, ErrorResponse, Unit] =
    for {
      _ <- ZIO.log(s"Attempting to adjust invoice $invoiceId")
      stage <- ZIO.service[Stage]
      productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(stage, billingPeriod))
      invoiceResponse <- GetInvoiceItems.get(invoiceId)
      invoiceItems = invoiceResponse.invoiceItems
      invoiceItem <- ZIO
        .fromOption(
          invoiceItems.find(
            _.productRatePlanChargeId == productSwitchRatePlanIds.supporterPlusRatePlanIds.subscriptionRatePlanChargeId,
          ),
        )
        .orElseFail(
          InternalServerError(s"Could not find invoice item for ratePlanChargeId ${subscriptionName.value}"),
        )
      _ <- InvoiceItemAdjustment.update(
        invoiceId,
        balanceToAdjust,
        invoiceItem.id,
        "Credit",
      )
    } yield ()

  private def getNewTermLengthInDays(today: LocalDate, termStartDate: LocalDate): String =
    Math.max(ChronoUnit.DAYS.between(termStartDate, today).toInt, 1).toString

  private def updateIfTermStartedToday(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlanId: String,
      price: BigDecimal,
  ) = {
    for {
      updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
        case (addRatePlan, removeRatePlan) =>
          SwitchProductUpdateRequest(
            add = addRatePlan,
            remove = removeRatePlan,
            collect = None,
            currentTerm = None,
            currentTermPeriodType = None,
            runBilling = Some(true),
            preview = Some(false),
          )
      }
      updateResponse <- SubscriptionUpdate.update[SubscriptionUpdateResponse](subscriptionName, updateRequestBody)
      invoiceId <- ZIO
        .fromOption(updateResponse.invoiceId)
        .orElseFail(InternalServerError("invoiceId was null in the response from subscription update"))
    } yield invoiceId
  }

  private def updateWithTermRenewal(
      // stage: Stage,
      today: LocalDate,
      termStartDate: LocalDate,
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlanId: String,
      price: BigDecimal,
  ): ZIO[TermRenewal with Stage with GetSubscription with SubscriptionUpdate, ErrorResponse, String] = {
    val newTermLength = getNewTermLengthInDays(today, termStartDate)
    for {
      updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
        case (addRatePlan, removeRatePlan) =>
          SwitchProductUpdateRequest(
            add = addRatePlan,
            remove = removeRatePlan,
            collect = None,
            currentTerm = Some(newTermLength),
            currentTermPeriodType = Some("Day"),
            runBilling = Some(false),
            preview = Some(false),
          )
      }
      updateResponse <- SubscriptionUpdate.update[SubscriptionUpdateResponse](subscriptionName, updateRequestBody)

      // productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(stage, billingPeriod))

      // Renew the subscription
      renewalResult <- TermRenewal.renewSubscription(subscriptionName, collectPayment = false)

      invoiceId <- ZIO
        .fromOption(renewalResult.invoiceId)
        .orElseFail(InternalServerError("invoiceId was null in the response from term renewal"))
    } yield invoiceId

  }

  private def doUpdate(
      subscriptionName: SubscriptionName,
      price: BigDecimal,
      checkChargeAmountBeforeUpdate: Boolean,
      previousAmount: BigDecimal,
      ratePlanCharge: RatePlanCharge,
      currency: Currency,
      currentRatePlan: GetSubscription.RatePlan,
      subscription: GetSubscription.GetSubscriptionResponse,
      csrUserId: Option[String],
      caseId: Option[String],
  ): ZIO[
    GetAccount
      with SubscriptionUpdate
      with TermRenewal
      with GetSubscription
      with GetInvoiceItems
      with GetInvoice
      with CreatePayment
      with InvoiceItemAdjustment
      with SQS
      with Stage
      with Dynamo,
    ErrorResponse,
    OutputBody,
  ] = {
    import ratePlanCharge.billingPeriod

    for {
      _ <- ZIO.log(
        s"Performing product move update with switch type ${SwitchType.RecurringContributionToSupporterPlus.id}",
      )
      _ <- ZIO.log(
        s"checkChargeAmountBeforeUpdate is $checkChargeAmountBeforeUpdate for subscription ${subscriptionName.value}",
      )

      today <- Clock.currentDateTime.map(_.toLocalDate)
      accountFuture <- GetAccount.get(subscription.accountNumber).fork
      subscription <- GetSubscription.get(subscriptionName)

      // To avoid problems with charges not aligning correctly with the term and resulting in unpredictable
      // billing dates and amounts, we need to start a new term for the new subscription version.
      // To do this we reduce the the current term length so that it ends today in the update subscription request
      // and then renew the sub using a separate request

      termStartedToday = subscription.termStartDate.isEqual(today)

      invoiceId <-
        if (termStartedToday)
          updateIfTermStartedToday(
            subscriptionName,
            billingPeriod,
            currency,
            currentRatePlan.id,
            price,
          )
        else
          updateWithTermRenewal(
            today,
            subscription.termStartDate,
            subscriptionName,
            billingPeriod,
            currency,
            currentRatePlan.id,
            price,
          )

      _ <- ZIO.log(s"Invoice id is $invoiceId")

      // Get invoice with invoice id
      invoiceBalance <- GetInvoice.get(invoiceId).map(_.balance)

      account <- accountFuture.join

      /*
        If the amount payable today is less than 0.50, we don't want to collect payment. Stripe has a minimum charge of 50 cents.
        Instead we write-off the invoices in the `adjustNonCollectedInvoices` function.
       */
      _ <-
        if (invoiceBalance < 0 || invoiceBalance >= 0.5) {
          import account._
          CreatePayment.create(
            basicInfo.id,
            invoiceId,
            basicInfo.defaultPaymentMethod.id,
            invoiceBalance,
            today,
          )
        } else {
          adjustNonCollectedInvoice(
            invoiceId,
            billingPeriod,
            subscriptionName,
            invoiceBalance,
          )
        }

      identityId <- ZIO
        .fromOption(account.basicInfo.IdentityId__c)
        .orElseFail(InternalServerError(s"identityId is null for subscription name ${subscriptionName.value}"))

//      todaysDate <- Clock.currentDateTime.map(_.toLocalDate)
//      billingPeriodValue <- billingPeriod.value

//      paidAmount = updateResponse.paidAmount.getOrElse(BigDecimal(0))

//      emailFuture <- SQS
//        .sendEmail(
//          message = EmailMessage(
//            EmailPayload(
//              Address = Some(account.billToContact.workEmail),
//              ContactAttributes = EmailPayloadContactAttributes(
//                SubscriberAttributes = RCtoSPEmailPayloadProductSwitchAttributes(
//                  first_name = account.billToContact.firstName,
//                  last_name = account.billToContact.lastName,
//                  currency = account.basicInfo.currency.symbol,
//                  price = price.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
//                  first_payment_amount =
//                    if (collectPayment) paidAmount.setScale(2, BigDecimal.RoundingMode.FLOOR).toString else "0.00",
//                  date_of_first_payment = todaysDate.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
//                  payment_frequency = billingPeriodValue + "ly",
//                  subscription_id = subscriptionName.value,
//                ),
//              ),
//            ),
//            "SV_RCtoSP_Switch",
//            account.basicInfo.sfContactId__c,
//            Some(identityId),
//          ),
//        )
//        .fork
//
//      salesforceTrackingFuture <- SQS
//        .queueSalesforceTracking(
//          SalesforceRecordInput(
//            subscriptionName.value,
//            previousAmount,
//            price,
//            currentRatePlan.productName,
//            currentRatePlan.ratePlanName,
//            "Supporter Plus",
//            todaysDate,
//            todaysDate,
//            if (collectPayment) paidAmount else BigDecimal(0),
//            csrUserId,
//            caseId,
//          ),
//        )
//        .fork
//
//      amendSupporterProductDynamoTableFuture <- Dynamo
//        .writeItem(
//          SupporterRatePlanItem(
//            subscriptionName.value,
//            identityId = identityId,
//            gifteeIdentityId = None,
//            productRatePlanId = productSwitchRatePlanIds.supporterPlusRatePlanIds.ratePlanId,
//            productRatePlanName = "product-move-api added Supporter Plus Monthly",
//            termEndDate = todaysDate.plusDays(7),
//            contractEffectiveDate = todaysDate,
//            contributionAmount = None,
//          ),
//        )
//        .fork
//
//      requests = emailFuture
//        .zip(salesforceTrackingFuture)
//        .zip(amendSupporterProductDynamoTableFuture)
//
//      _ <- requests.join

    } yield Success(
      s"Product move completed successfully with subscription number ${subscriptionName.value} and switch type ${SwitchType.RecurringContributionToSupporterPlus.id}",
    )
  }
}
given JsonDecoder[SubscriptionUpdateInvoice] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoice]
given JsonDecoder[SubscriptionUpdateInvoiceItem] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoiceItem]
