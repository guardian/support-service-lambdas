package com.gu.productmove.endpoint.move.switchtype

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.ZuoraIds.zuoraIdsForStage
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.endpoint.move.stringFor
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetAccount.GetAccountResponse
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlanCharge}
import com.gu.productmove.zuora.model.{InvoiceId, SubscriptionName}
import com.gu.productmove.zuora.*
import com.gu.util.config
import sttp.tapir.*
import zio.{Clock, Task, ZIO}

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

trait ToRecurringContribution {
  def run(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      subscription: GetSubscriptionResponse,
      account: GetAccountResponse,
  ): Task[OutputBody]
}

class ToRecurringContributionImpl(
    subscriptionUpdate: SubscriptionUpdate,
    termRenewal: TermRenewal,
    sqs: SQS,
    stage: Stage,
) extends ToRecurringContribution {
  def run(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      subscription: GetSubscriptionResponse,
      account: GetAccountResponse,
  ): Task[OutputBody] =
    for {
      _ <- ZIO.log("ToRecurringContribution PostData: " + postData.toString)

      activeRatePlanAndCharge <- ZIO
        .fromOption(getActiveRatePlanAndCharge(subscription.ratePlans))
        .orElseFail(
          new Throwable(
            s"Could not find a ratePlanCharge with a non-null chargedThroughDate for subscription name ${subscriptionName.value}",
          ),
        )
      (activeRatePlan, activeRatePlanCharge) = activeRatePlanAndCharge

      currency <- ZIO
        .fromOption(activeRatePlanCharge.currencyObject)
        .orElseFail(
          new Throwable(
            s"Missing or unknown currency ${activeRatePlanCharge.currency} on rate plan charge in rate plan ${activeRatePlan.id} ",
          ),
        )

      _ <- ZIO.log(s"Performing product move update with switch type ${SwitchType.ToRecurringContribution.id}")

      identityId <- ZIO
        .fromOption(account.basicInfo.IdentityId__c)
        .orElseFail(new Throwable(s"identityId is null for subscription name ${subscriptionName.value}"))

      price = postData.price
      previousAmount = activeRatePlanCharge.price.get
      billingPeriod <- ZIO
        .fromOption(activeRatePlanCharge.billingPeriod)
        .orElseFail(new Throwable(s"billingPeriod is null for rate plan charge $activeRatePlanCharge"))

      // Make sure that price is valid and acceptable
      _ <- validateOldMembershipPrice(currency, billingPeriod, price)

      today <- Clock.currentDateTime.map(_.toLocalDate)
      chargedThroughDate = activeRatePlanCharge.chargedThroughDate.get

      // Check if we need term renewal to avoid "cancellation date cannot be later than term end date" error
      // We need to perform term renewal if the chargedThroughDate (which will be used as the remove date)
      // extends beyond the current subscription term end date.
      needsTermRenewal = activeRatePlanCharge.chargedThroughDate.exists(_.isAfter(subscription.termEndDate))
      _ <- ZIO.when(needsTermRenewal) {
        ZIO.log(
          s"Performing term renewal because chargedThroughDate $chargedThroughDate is after termEndDate ${subscription.termEndDate}",
        ) *>
          termRenewal.renewSubscription(subscriptionName, runBilling = false) *>
          ZIO.log(s"Term renewal completed for subscription $subscriptionName")
      }

      updateRequestBody <- getRatePlans(
        billingPeriod,
        price,
        subscription.ratePlans,
        chargedThroughDate,
      ).map { case (addRatePlan, removeRatePlan) =>
        SwitchProductUpdateRequest(
          add = addRatePlan,
          remove = removeRatePlan,
          collect = Some(false),
          runBilling = Some(true),
          preview = Some(false),
          targetDate = None,
        )
      }

      _ <- subscriptionUpdate
        .update[SubscriptionUpdateResponse](SubscriptionName(subscription.id), updateRequestBody)

      todaysDate = today

      paidAmount = BigDecimal(0)

      emailFuture <- sqs
        .sendEmail(
          message = EmailMessage(
            EmailPayload(
              Address = Some(account.billToContact.workEmail),
              ContactAttributes = EmailPayloadContactAttributes(
                SubscriberAttributes = toRCEmailPayloadProductSwitchAttributes(
                  first_name = account.billToContact.firstName,
                  last_name = account.billToContact.lastName,
                  currency = account.basicInfo.currency.symbol,
                  price = price.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                  start_date =
                    activeRatePlanCharge.chargedThroughDate.get.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                  payment_frequency = stringFor(billingPeriod),
                  subscription_id = subscriptionName.value,
                ),
              ),
            ),
            "SV_MBtoRC_Switch",
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
            activeRatePlan.productName,
            activeRatePlan.ratePlanName,
            "Recurring Contribution",
            todaysDate,
            activeRatePlanCharge.chargedThroughDate.get,
            paidAmount,
            postData.csrUserId,
            postData.caseId,
          ),
        )
        .fork

      requests = emailFuture.zip(salesforceTrackingFuture)
      _ <- requests.join
    } yield Success(
      s"Product move completed successfully with subscription number ${subscriptionName.value} and switch type ${SwitchType.ToRecurringContribution.id}",
    )

  case class RecurringContributionIds(
      ratePlanId: String,
      ratePlanChargeId: String,
  )

  private def getRecurringContributionRatePlanId(
      stage: Stage,
      billingPeriod: BillingPeriod,
  ): Either[Throwable, RecurringContributionIds] = {
    zuoraIdsForStage(config.Stage(stage.toString)).left.map(e => new Throwable(e)).flatMap { zuoraIds =>
      import zuoraIds.contributionsZuoraIds.{annual, monthly}

      billingPeriod match {
        case Monthly =>
          Right(RecurringContributionIds(monthly.productRatePlanId.value, monthly.productRatePlanChargeId.value))
        case Annual =>
          Right(RecurringContributionIds(annual.productRatePlanId.value, annual.productRatePlanChargeId.value))
        case _ => Left(new Throwable(s"error when matching on billingPeriod $billingPeriod"))
      }
    }
  }

  private def getRatePlans(
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      ratePlanAmendments: Seq[GetSubscription.RatePlan],
      chargedThroughDate: LocalDate,
  ): Task[(List[AddRatePlan], List[RemoveRatePlan])] =
    for {
      contributionRatePlanIds <- ZIO.fromEither(
        getRecurringContributionRatePlanId(stage, billingPeriod),
      )

      overrideAmount = price

      chargeOverride = ChargeOverrides(
        price = Some(overrideAmount),
        productRatePlanChargeId = contributionRatePlanIds.ratePlanChargeId,
      )
      addRatePlan = AddRatePlan(
        chargedThroughDate,
        contributionRatePlanIds.ratePlanId,
        chargeOverrides = List(chargeOverride),
      )
      removeRatePlans = ratePlanAmendments
        .filterNot(_.lastChangeType.contains("Remove"))
        .map { ratePlan =>
          val effectiveStartDate = ratePlan.ratePlanCharges.headOption.map(_.effectiveStartDate)
          val removeDate = effectiveStartDate.filter(_.isAfter(chargedThroughDate)).getOrElse(chargedThroughDate)
          RemoveRatePlan(removeDate, ratePlan.id)
        }
    } yield (List(addRatePlan), removeRatePlans.toList)

  private def getActiveRatePlanAndCharge(
      ratePlanAmendments: List[GetSubscription.RatePlan],
  ): Option[(GetSubscription.RatePlan, GetSubscription.RatePlanCharge)] = (for {
    ratePlan <- ratePlanAmendments
    if !ratePlan.lastChangeType.contains("Remove")
    ratePlanCharge <- ratePlan.ratePlanCharges
    if ratePlanCharge.chargedThroughDate.isDefined
  } yield (ratePlan, ratePlanCharge)).headOption

  private def validateOldMembershipPrice(
      currency: Currency,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
  ): Task[Unit] = {
    val expectedPrices = Map(
      "GBP" -> Map("month" -> 5, "year" -> 49),
      "USD" -> Map("month" -> 6.99, "year" -> 69),
      "EUR" -> Map("month" -> 4.99, "year" -> 49),
      "AUD" -> Map("month" -> 10, "year" -> 100),
      "CAD" -> Map("month" -> 6.99, "year" -> 69),
    )

    val periodKey = billingPeriod match {
      case Monthly => "month"
      case Annual => "year"
      case _ => throw new IllegalArgumentException(s"Unsupported billing period: $billingPeriod")
    }

    val currencyCode = currency.iso

    expectedPrices.get(currencyCode) match {
      case Some(prices) if prices.get(periodKey).contains(price.toDouble) =>
        ZIO.unit
      case _ =>
        ZIO.fail(
          new Throwable(
            s"Invalid price $price for currency $currencyCode and billing period $billingPeriod. Expected: ${expectedPrices
                .get(currencyCode)
                .flatMap(_.get(periodKey))}",
          ),
        )
    }
  }

}
