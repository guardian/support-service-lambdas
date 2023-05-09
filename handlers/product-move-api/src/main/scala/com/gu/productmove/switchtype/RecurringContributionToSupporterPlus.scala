package com.gu.productmove.endpoint.move

import com.gu.effects.GetFromS3
import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlusV2, MonthlySupporterPlusV2}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Annual, BillingPeriod, Monthly, PricesFromZuoraCatalog}
import com.gu.productmove.GuStageLive.Stage
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
  GetAccount,
  GetAccountLive,
  GetSubscription,
  GetSubscriptionLive,
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
  ZuoraCancel,
  ZuoraCancelLive,
}
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  Dynamo,
  DynamoLive,
  EmailMessage,
  EmailPayload,
  EmailPayloadContactAttributes,
  EmailPayloadProductSwitchAttributes,
  GuStageLive,
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

val SwitchToV2SupporterPlus = false

case class SupporterPlusRatePlanIds(
    ratePlanId: String,
    subscriptionRatePlanChargeId: String,
    contributionRatePlanChargeId: Option[String],
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
    GetSubscription with SubscriptionUpdate with GetAccount with SQS with Dynamo with Stage,
    ErrorResponse,
    OutputBody,
  ] = {
    (for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName)

      currentRatePlan <- getSingleOrNotEligible(
        subscription.ratePlans,
        s"Subscription: ${subscriptionName.value} has more than one ratePlan",
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
            currency,
            currentRatePlan.id,
          )
        else
          doUpdate(
            subscriptionName,
            postData.price,
            BigDecimal(ratePlanCharge.price.get),
            ratePlanCharge.billingPeriod,
            currency,
            currentRatePlan,
            subscription,
            postData.csrUserId,
            postData.caseId,
          )
    } yield result).fold(error => error, success => success)
  }

  private def getSupporterPlusRatePlanIds(
      stage: Stage,
      billingPeriod: BillingPeriod,
  ): Either[ErrorResponse, SupporterPlusRatePlanIds] = {
    zuoraIdsForStage(config.Stage(stage.toString)).left
      .map(err => InternalServerError(err))
      .flatMap { zuoraIds =>
        import zuoraIds.supporterPlusZuoraIds.{annual, annualV2, monthly, monthlyV2}

        billingPeriod match {
          case Monthly if SwitchToV2SupporterPlus =>
            Right(
              SupporterPlusRatePlanIds(
                monthlyV2.productRatePlanId.value,
                monthlyV2.productRatePlanChargeId.value,
                Some(monthlyV2.contributionProductRatePlanChargeId.value),
              ),
            )
          case Monthly =>
            Right(
              SupporterPlusRatePlanIds(
                monthly.productRatePlanId.value,
                monthly.productRatePlanChargeId.value,
                None,
              ),
            )
          case Annual if SwitchToV2SupporterPlus =>
            Right(
              SupporterPlusRatePlanIds(
                annualV2.productRatePlanId.value,
                annualV2.productRatePlanChargeId.value,
                Some(annualV2.contributionProductRatePlanChargeId.value),
              ),
            )
          case Annual =>
            Right(
              SupporterPlusRatePlanIds(
                annual.productRatePlanId.value,
                annual.productRatePlanChargeId.value,
                None,
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
    if (SwitchToV2SupporterPlus)
      // work out how much of what the user is paying can be treated as a contribution (total amount - cost of sub)
      val catalogPlanId =
        if (billingPeriod == Monthly)
          MonthlySupporterPlusV2
        else
          AnnualSupporterPlusV2
      ZIO
        .fromEither(
          getSubscriptionPriceInMinorUnits(stage, catalogPlanId, currency)
            .map(subscriptionChargePrice => price - (subscriptionChargePrice.value / 100)),
        )
        .mapError(x => InternalServerError(x))
    else ZIO.succeed(price)

  def getRatePlans(
      billingPeriod: BillingPeriod,
      currency: Currency,
      ratePlanIdToRemove: String,
      price: BigDecimal,
  ): ZIO[Stage, ErrorResponse, (List[AddRatePlan], List[RemoveRatePlan])] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
      stage <- ZIO.service[Stage]
      supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, billingPeriod))
      overrideAmount <- getContributionAmount(stage, price, currency, billingPeriod)
      chargeOverride = ChargeOverrides(
        price = Some(overrideAmount),
        productRatePlanChargeId = supporterPlusRatePlanIds.contributionRatePlanChargeId.getOrElse(
          supporterPlusRatePlanIds.subscriptionRatePlanChargeId,
        ),
      )
      addRatePlan = AddRatePlan(date, supporterPlusRatePlanIds.ratePlanId, chargeOverrides = List(chargeOverride))
      removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
    } yield (List(addRatePlan), List(removeRatePlan))

  private def doPreview(
      subscriptionName: SubscriptionName,
      price: BigDecimal,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlanId: String,
  ): ZIO[SubscriptionUpdate with Stage, ErrorResponse, OutputBody] = for {
    _ <- ZIO.log("Fetching Preview from Zuora")

    today <- Clock.currentDateTime.map(_.toLocalDate)

    updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
      case (addRatePlan, removeRatePlan) =>
        SubscriptionUpdateRequest(
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
    supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, billingPeriod))
    previewResult <- BuildPreviewResult.getPreviewResult(response.invoice, supporterPlusRatePlanIds)
  } yield previewResult

  private def doUpdate(
      subscriptionName: SubscriptionName,
      price: BigDecimal,
      previousAmount: BigDecimal,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlan: GetSubscription.RatePlan,
      subscription: GetSubscription.GetSubscriptionResponse,
      csrUserId: Option[String],
      caseId: Option[String],
  ): ZIO[GetAccount with SubscriptionUpdate with SQS with Stage with Dynamo, ErrorResponse, OutputBody] = for {
    _ <- ZIO.log("Performing product move update")
    stage <- ZIO.service[Stage]
    account <- GetAccount.get(subscription.accountNumber)

    identityId <- ZIO
      .fromOption(account.basicInfo.IdentityId__c)
      .orElseFail(InternalServerError(s"identityId is null for subscription name ${subscriptionName.value}"))

    updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlan.id, price).map {
      case (addRatePlan, removeRatePlan) =>
        SubscriptionUpdateRequest(
          add = addRatePlan,
          remove = removeRatePlan,
          collect = Some(true),
          runBilling = Some(true),
          preview = Some(false),
        )
    }

    updateResponse <- SubscriptionUpdate
      .update[SubscriptionUpdateResponse](subscriptionName, updateRequestBody)

    todaysDate <- Clock.currentDateTime.map(_.toLocalDate)
    billingPeriodValue <- billingPeriod.value

    paidAmount = updateResponse.paidAmount.getOrElse(BigDecimal(0))

    emailFuture <- SQS
      .sendEmail(
        message = EmailMessage(
          EmailPayload(
            Address = Some(account.billToContact.workEmail),
            ContactAttributes = EmailPayloadContactAttributes(
              SubscriberAttributes = EmailPayloadProductSwitchAttributes(
                first_name = account.billToContact.firstName,
                last_name = account.billToContact.lastName,
                currency = account.basicInfo.currency.symbol,
                price = price.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                first_payment_amount = paidAmount.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                date_of_first_payment = todaysDate.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                payment_frequency = billingPeriodValue + "ly",
                subscription_id = subscriptionName.value,
              ),
            ),
          ),
          "SV_RCtoSP_Switch",
          account.basicInfo.sfContactId__c,
          Some(identityId),
        ),
      )
      .fork

    salesforceTrackingFuture <- SQS
      .queueSalesforceTracking(
        SalesforceRecordInput(
          subscriptionName.value,
          previousAmount,
          price,
          currentRatePlan.productName,
          currentRatePlan.ratePlanName,
          "Supporter Plus",
          todaysDate,
          todaysDate,
          paidAmount,
          csrUserId,
          caseId,
        ),
      )
      .fork

    supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, billingPeriod))
    amendSupporterProductDynamoTableFuture <- Dynamo
      .writeItem(
        SupporterRatePlanItem(
          subscriptionName.value,
          identityId = identityId,
          gifteeIdentityId = None,
          productRatePlanId = supporterPlusRatePlanIds.ratePlanId,
          productRatePlanName = "product-move-api added Supporter Plus Monthly",
          termEndDate = todaysDate.plusDays(7),
          contractEffectiveDate = todaysDate,
          contributionAmount = None,
        ),
      )
      .fork

    requests = emailFuture
      .zip(salesforceTrackingFuture)
      .zip(amendSupporterProductDynamoTableFuture)

    _ <- requests.join

  } yield Success("Product move completed successfully")
}

given JsonDecoder[SubscriptionUpdatePreviewResponse] = DeriveJsonDecoder.gen[SubscriptionUpdatePreviewResponse]
given JsonDecoder[SubscriptionUpdateInvoice] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoice]
given JsonDecoder[SubscriptionUpdateInvoiceItem] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoiceItem]
given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]
