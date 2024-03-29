package com.gu.productmove.endpoint.move

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import zio.Task
import zio.RIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.*
import com.gu.productmove.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.util.config
import com.gu.productmove.zuora.given_JsonDecoder_SubscriptionUpdateResponse
import sttp.tapir.EndpointIO.Example
import sttp.tapir.*
import sttp.tapir.json.zio.jsonBody
import zio.ThreadLocalBridge.trace
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import zio.{Clock, IO, URIO, ZIO}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object ToRecurringContribution {
  def apply(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
  ): RIO[
    GetSubscription with SubscriptionUpdate with GetAccount with SQS with Stage,
    OutputBody,
  ] = {
    (for {
      _ <- ZIO.log("ToRecurringContribution PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName)

      activeRatePlanAndCharge <- ZIO
        .fromOption(getActiveRatePlanAndCharge(subscription.ratePlans))
        .orElseFail(
          InternalServerError(
            s"Could not find a ratePlanCharge with a non-null chargedThroughDate for subscription name ${subscriptionName.value}",
          ),
        )
      (activeRatePlan, activeRatePlanCharge) = activeRatePlanAndCharge

      currency <- ZIO
        .fromOption(activeRatePlanCharge.currencyObject)
        .orElseFail(
          InternalServerError(
            s"Missing or unknown currency ${activeRatePlanCharge.currency} on rate plan charge in rate plan ${activeRatePlan.id} ",
          ),
        )

      _ <- ZIO.log(s"Performing product move update with switch type ${SwitchType.ToRecurringContribution.id}")

      account <- GetAccount.get(subscription.accountNumber)

      identityId <- ZIO
        .fromOption(account.basicInfo.IdentityId__c)
        .orElseFail(InternalServerError(s"identityId is null for subscription name ${subscriptionName.value}"))

      price = postData.price
      previousAmount = activeRatePlanCharge.price.get
      billingPeriod = activeRatePlanCharge.billingPeriod

      updateRequestBody <- getRatePlans(
        billingPeriod,
        previousAmount,
        subscription.ratePlans,
        activeRatePlanCharge.chargedThroughDate.get,
      )
        .map { case (addRatePlan, removeRatePlan) =>
          SwitchProductUpdateRequest(
            add = addRatePlan,
            remove = removeRatePlan,
            collect = Some(false),
            runBilling = Some(true),
            preview = Some(false),
            targetDate = None,
          )
        }

      _ <- SubscriptionUpdate
        .update[SubscriptionUpdateResponse](SubscriptionName(subscription.id), updateRequestBody)

      todaysDate <- Clock.currentDateTime.map(_.toLocalDate)
      billingPeriodValue <- billingPeriod.value

      paidAmount = BigDecimal(0)

      emailFuture <- SQS
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
                  payment_frequency = billingPeriodValue + "ly",
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

      salesforceTrackingFuture <- SQS
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
    ))
      .fold(error => error, success => success)
  }

  case class RecurringContributionIds(
      ratePlanId: String,
      ratePlanChargeId: String,
  )

  private def getRecurringContributionRatePlanId(
      stage: Stage,
      billingPeriod: BillingPeriod,
  ): Either[ErrorResponse, RecurringContributionIds] = {
    zuoraIdsForStage(config.Stage(stage.toString)).left.map(e => InternalServerError(e)).flatMap { zuoraIds =>
      import zuoraIds.contributionsZuoraIds.{annual, monthly}

      billingPeriod match {
        case Monthly =>
          Right(RecurringContributionIds(monthly.productRatePlanId.value, monthly.productRatePlanChargeId.value))
        case Annual =>
          Right(RecurringContributionIds(annual.productRatePlanId.value, annual.productRatePlanChargeId.value))
        case _ => Left(InternalServerError(s"error when matching on billingPeriod $billingPeriod"))
      }
    }
  }

  private def getRatePlans(
      billingPeriod: BillingPeriod,
      previousAmount: Double,
      ratePlanAmendments: Seq[GetSubscription.RatePlan],
      chargedThroughDate: LocalDate,
  ): ZIO[Stage, ErrorResponse, (List[AddRatePlan], List[RemoveRatePlan])] =
    for {
      stage <- ZIO.service[Stage]
      contributionRatePlanIds <- ZIO.fromEither(
        getRecurringContributionRatePlanId(stage, billingPeriod),
      )

      overrideAmount = previousAmount

      chargeOverride = ChargeOverrides(
        price = Some(overrideAmount),
        productRatePlanChargeId = contributionRatePlanIds.ratePlanChargeId,
      )
      addRatePlan = AddRatePlan(
        chargedThroughDate,
        contributionRatePlanIds.ratePlanId,
        chargeOverrides = List(chargeOverride),
      )
      removeRatePlans = ratePlanAmendments.map(ratePlan => {
        val effectiveStartDate = ratePlan.ratePlanCharges.headOption.map(_.effectiveStartDate)
        val removeDate = effectiveStartDate.filter(_.isAfter(chargedThroughDate)).getOrElse(chargedThroughDate)
        RemoveRatePlan(removeDate, ratePlan.id)
      })
    } yield (List(addRatePlan), removeRatePlans.toList)

  private def getActiveRatePlanAndCharge(
      ratePlanAmendments: List[GetSubscription.RatePlan],
  ): Option[(GetSubscription.RatePlan, GetSubscription.RatePlanCharge)] = (for {
    ratePlan <- ratePlanAmendments
    ratePlanCharge <- ratePlan.ratePlanCharges
    if ratePlanCharge.chargedThroughDate.isDefined
  } yield (ratePlan, ratePlanCharge)).headOption

}
