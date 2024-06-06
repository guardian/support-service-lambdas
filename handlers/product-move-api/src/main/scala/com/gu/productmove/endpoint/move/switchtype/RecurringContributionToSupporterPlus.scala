package com.gu.productmove.endpoint.move.switchtype

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.*
import com.gu.productmove.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.endpoint.move.stringFor
import com.gu.productmove.move.BuildPreviewResult
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.GetAccount.GetAccountResponse
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlanCharge}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.supporterdata.model.SupporterRatePlanItem
import zio.*

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

trait RecurringContributionToSupporterPlus {

  def run(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      subscription: GetSubscription.GetSubscriptionResponse,
      account: GetAccount.GetAccountResponse,
  ): Task[OutputBody]
}

class RecurringContributionToSupporterPlusImpl(
    getRatePlans: GetRatePlans,
    subscriptionUpdate: SubscriptionUpdate,
    termRenewal: TermRenewal,
    getInvoiceItems: GetInvoiceItems,
    getInvoice: GetInvoice,
    createPayment: CreatePayment,
    invoiceItemAdjustment: InvoiceItemAdjustment,
    sqs: SQS,
    dynamo: Dynamo,
) extends RecurringContributionToSupporterPlus {
  override def run(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      subscription: GetSubscriptionResponse,
      account: GetAccountResponse,
  ): Task[OutputBody] =
    for {
      _ <- ZIO.log("RecurringContributionToSupporterPlus PostData: " + postData.toString)

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
          new Throwable(
            s"Missing or unknown currency ${ratePlanCharge.currency} on rate plan charge in rate plan ${currentRatePlan.id} ",
          ),
        )
      billingPeriod <- ZIO
        .fromOption(ratePlanCharge.billingPeriod)
        .orElseFail(
          new Throwable(
            s"Missing billing period on rate plan charge in rate plan $currentRatePlan ",
          ),
        )

      result <-
        if (postData.preview)
          doPreview(
            SubscriptionName(subscription.id),
            postData.price,
            billingPeriod,
            ratePlanCharge,
            currency,
            currentRatePlan.id,
          )
        else
          doUpdate(
            subscriptionName,
            account,
            postData.price,
            BigDecimal(ratePlanCharge.price.get),
            ratePlanCharge,
            currency,
            currentRatePlan,
            subscription,
            postData.csrUserId,
            postData.caseId,
          )
    } yield result

  private def doPreview(
      subscriptionName: SubscriptionName,
      price: BigDecimal,
      billingPeriod: BillingPeriod,
      activeRatePlanCharge: RatePlanCharge,
      currency: Currency,
      currentRatePlanId: String,
  ): Task[OutputBody] = for {
    _ <- ZIO.log("Fetching Preview from Zuora")

    today <- Clock.currentDateTime.map(_.toLocalDate)

    updateRequestBody <- getRatePlans.getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
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

    response <- subscriptionUpdate
      .update[SubscriptionUpdatePreviewResponse](subscriptionName, updateRequestBody)

    productSwitchRatePlanIds <- ZIO.fromEither(getRatePlans.getProductSwitchRatePlanIds(billingPeriod))
    previewResult <- BuildPreviewResult.getPreviewResult(
      subscriptionName,
      activeRatePlanCharge,
      response.invoice,
      productSwitchRatePlanIds,
    )
  } yield previewResult

  private def doUpdate(
      subscriptionName: SubscriptionName,
      account: GetAccountResponse,
      price: BigDecimal,
      previousAmount: BigDecimal,
      ratePlanCharge: RatePlanCharge,
      currency: Currency,
      currentRatePlan: GetSubscription.RatePlan,
      subscription: GetSubscription.GetSubscriptionResponse,
      csrUserId: Option[String],
      caseId: Option[String],
  ): Task[OutputBody] = {
    import ratePlanCharge.billingPeriod
    for {
      _ <- ZIO.log(
        s"Performing product move update with switch type ${SwitchType.RecurringContributionToSupporterPlus.id}",
      )

      today <- Clock.currentDateTime.map(_.toLocalDate)
      billingPeriod <- ZIO
        .fromOption(ratePlanCharge.billingPeriod)
        .orElseFail(
          new Throwable(
            s"Missing billing period on rate plan charge in rate plan $currentRatePlan ",
          ),
        )
      supporterPlusRatePlanIds <- getRatePlans.getSupporterPlusRatePlanIds(billingPeriod)

      // To avoid problems with charges not aligning correctly with the term and resulting in unpredictable
      // billing dates and amounts, we need to start a new term subscriptions which are switched on any day other
      // than a term start date.
      termStartedToday = subscription.termStartDate.isEqual(today)
      invoiceId <-
        if (termStartedToday)
          updateWithExistingTerm(
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

      // Get the amount of the invoice with which was created by the product switch
      _ <- ZIO.log(s"Invoice generated by update has id of $invoiceId")
      invoiceBalance <- getInvoice.get(invoiceId).map(_.balance)

      /*
        If the amount payable today is less than 0.50, we don't want to collect payment because Stripe has a minimum
        charge of 50 cents. Instead we write-off the invoices in the `adjustNonCollectedInvoices` function.
       */
      paidAmount <-
        if (invoiceBalance == 0) {
          ZIO.succeed(BigDecimal(0))
        } else if (invoiceBalance < 0 || invoiceBalance >= 0.5) {
          // not clear why we would want to create a negative payment, but this logic was already in place
          import account._
          createPayment
            .create(
              basicInfo.id,
              invoiceId,
              basicInfo.defaultPaymentMethod.id,
              invoiceBalance,
              today,
            )
            .as(invoiceBalance)
        } else {
          adjustNonCollectedInvoice(
            invoiceId,
            supporterPlusRatePlanIds,
            subscriptionName,
            invoiceBalance,
          ).as(BigDecimal(0))
        }

      _ <- ZIO.log(s"The amount paid on switch by the customer was $paidAmount")

      identityId <- ZIO
        .fromOption(account.basicInfo.IdentityId__c)
        .orElseFail(new Throwable(s"identityId is null for subscription name ${subscriptionName.value}"))

      emailFuture <- sqs
        .sendEmail(
          message = EmailMessage(
            EmailPayload(
              Address = Some(account.billToContact.workEmail),
              ContactAttributes = EmailPayloadContactAttributes(
                SubscriberAttributes = RCtoSPEmailPayloadProductSwitchAttributes(
                  first_name = account.billToContact.firstName,
                  last_name = account.billToContact.lastName,
                  currency = account.basicInfo.currency.symbol,
                  price = price.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                  first_payment_amount = paidAmount.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                  date_of_first_payment = today.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                  payment_frequency = stringFor(billingPeriod),
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

      salesforceTrackingFuture <- sqs
        .queueSalesforceTracking(
          SalesforceRecordInput(
            subscriptionName.value,
            previousAmount,
            price,
            currentRatePlan.productName,
            currentRatePlan.ratePlanName,
            "Supporter Plus",
            today,
            today,
            paidAmount,
            csrUserId,
            caseId,
          ),
        )
        .fork

      amendSupporterProductDynamoTableFuture <- dynamo
        .writeItem(
          SupporterRatePlanItem(
            subscriptionName.value,
            identityId = identityId.rawIdentityId,
            gifteeIdentityId = None,
            productRatePlanId = supporterPlusRatePlanIds.ratePlanId,
            productRatePlanName = "product-move-api added Supporter Plus Monthly",
            termEndDate = today.plusDays(7),
            contractEffectiveDate = today,
            contributionAmount = None,
          ),
        )
        .fork

      requests = emailFuture
        .zip(salesforceTrackingFuture)
        .zip(amendSupporterProductDynamoTableFuture)

      _ <- requests.join

    } yield Success(
      s"Product move completed successfully with subscription number ${subscriptionName.value} and switch type ${SwitchType.RecurringContributionToSupporterPlus.id}",
    )
  }

  private def updateWithExistingTerm(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlanId: String,
      price: BigDecimal,
  ): Task[String] = {
    for {
      updateRequestBody <- getRatePlans.getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
        case (addRatePlan, removeRatePlan) =>
          SwitchProductUpdateRequest(
            add = addRatePlan,
            remove = removeRatePlan,
            currentTerm = None,
            currentTermPeriodType = None,
            // Run the billing here as this is the only change being made
            runBilling = Some(true),
            // We will collect via a separate create payment call if the amount payable is not too small
            collect = None,
            preview = Some(false),
          )
      }
      updateResponse <- subscriptionUpdate.update[SubscriptionUpdateResponse](subscriptionName, updateRequestBody)
      invoiceId <- ZIO
        .fromOption(updateResponse.invoiceId)
        .orElseFail(new Throwable("invoiceId was null in the response from subscription update"))
    } yield invoiceId
  }

  private def updateWithTermRenewal(
      today: LocalDate,
      termStartDate: LocalDate,
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      currency: Currency,
      currentRatePlanId: String,
      price: BigDecimal,
  ): Task[String] = {
    // To start a new term for this subscription we reduce the the current term length so that it ends today in
    // the update subscription request, and then renew the sub using a separate request
    val newTermLength = getNewTermLengthInDays(today, termStartDate)
    for {
      updateRequestBody <- getRatePlans.getRatePlans(billingPeriod, currency, currentRatePlanId, price).map {
        case (addRatePlan, removeRatePlan) =>
          SwitchProductUpdateRequest(
            add = addRatePlan,
            remove = removeRatePlan,
            currentTerm = Some(newTermLength),
            currentTermPeriodType = Some("Day"),
            // We will run the billing during the renewal call to ensure there's exactly one invoice produced for the switch
            runBilling = Some(false),
            // We will collect via a separate create payment call if the amount payable is not too small
            collect = None,
            preview = Some(false),
          )
      }
      updateResponse <- subscriptionUpdate.update[SubscriptionUpdateResponse](subscriptionName, updateRequestBody)
      renewalResult <- termRenewal.renewSubscription(
        subscriptionName,
        // this is the last change so run billing to get one invoice to cover all the changes
        runBilling = true,
      )
      invoiceId <- ZIO
        .fromOption(renewalResult.invoiceId)
        .orElseFail(new Throwable("invoiceId was null in the response from term renewal"))
    } yield invoiceId
  }

  /*
     This function is used to adjust the invoice item for the supporter plus subscription charge
   */
  private def adjustNonCollectedInvoice(
      invoiceId: String,
      supporterPlusRatePlanIds: SupporterPlusRatePlanIds,
      subscriptionName: SubscriptionName,
      balanceToAdjust: BigDecimal,
  ): Task[Unit] =
    for {
      _ <- ZIO.log(s"Attempting to adjust invoice $invoiceId")
      invoiceResponse <- getInvoiceItems.get(invoiceId)
      invoiceItems = invoiceResponse.invoiceItems
      invoiceItem <- ZIO
        .fromOption(
          invoiceItems.find(
            _.productRatePlanChargeId == supporterPlusRatePlanIds.subscriptionRatePlanChargeId,
          ),
        )
        .orElseFail(
          new Throwable(s"Could not find invoice item for ratePlanChargeId ${subscriptionName.value}"),
        )
      _ <- invoiceItemAdjustment.update(
        invoiceId,
        balanceToAdjust,
        invoiceItem.id,
        "Credit",
      )
    } yield ()

  private def getNewTermLengthInDays(today: LocalDate, termStartDate: LocalDate): String =
    ChronoUnit.DAYS.between(termStartDate, today).toInt.toString
  private def getSingleOrNotEligible[A](list: List[A], message: String): Task[A] =
    list.length match {
      case 1 => ZIO.succeed(list.head)
      case _ => ZIO.fail(new Throwable(message))
    }

}
