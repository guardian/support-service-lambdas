package com.gu.productmove.endpoint.move

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.util.config
import com.gu.util.config.ZuoraEnvironment
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.productmove.zuora.{
  AddRatePlan,
  GetAccount,
  GetAccountLive,
  GetSubscription,
  GetSubscriptionLive,
  RemoveRatePlan,
  Subscribe,
  SubscribeLive,
  SubscriptionUpdate,
  SubscriptionUpdateLive,
  SubscriptionUpdateRequest,
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
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.{Clock, IO, URIO, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import zio.ThreadLocalBridge.trace
import com.gu.newproduct.api.productcatalog.PricesFromZuoraCatalog
import com.gu.util.config.ZuoraEnvironment
import com.gu.effects.GetFromS3
import com.gu.newproduct.api.productcatalog.ZuoraIds.ZuoraIds

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import com.gu.i18n.Currency
import com.gu.productmove.endpoint.move.RecurringContributionToSupporterPlus.getSingleOrNotEligible
import com.gu.productmove.zuora.model.SubscriptionName

object MembershipToRecurringContribution {
  def apply(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
  ): ZIO[GetSubscription with SubscriptionUpdate with GetAccount with SQS with Dynamo with Stage, String, OutputBody] =
    (for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName).addLogMessage("GetSubscription")

      ratePlans = subscription.ratePlans
      currency <- ZIO
        .fromOption(ratePlanCharge.currencyObject)
        .orElseFail(
          s"Missing or unknown currency ${ratePlanCharge.currency} on rate plan charge in rate plan ${currentRatePlan.id} ",
        )

      result <- doUpdate(
        subscriptionName,
        postData.price,
        BigDecimal(ratePlanCharge.price),
        ratePlanCharge.billingPeriod,
        currency,
        ratePlans,
        subscription,
        postData.csrUserId,
        postData.caseId,
      )
    } yield result).fold(errorMessage => InternalServerError(errorMessage), success => success)

    def getRecurringContributionRatePlanId(
        stage: Stage,
        billingPeriod: BillingPeriod,
    ): Either[String, (String, String)] = {
      zuoraIdsForStage(config.Stage(stage.toString)).flatMap { zuoraIds =>
        import zuoraIds.contributionsZuoraIds.{annual, monthly}

        billingPeriod match {
          case Monthly =>
            Right((monthly.productRatePlanId.value, monthly.productRatePlanChargeId.value))
          case Annual =>
            Right((annual.productRatePlanId.value, annual.productRatePlanChargeId.value))
          case _ => Left(s"error when matching on billingPeriod $billingPeriod")
        }
      }
    }

    def getRatePlans(
        billingPeriod: BillingPeriod,
        currency: Currency,
        currentRatePlans: Seq[GetSubscription.RatePlan],
    ): ZIO[Stage, String, (List[AddRatePlan], List[RemoveRatePlan])] =
      for {
        date <- Clock.currentDateTime.map(_.toLocalDate)
        stage <- ZIO.service[Stage]
        (contributionRatePlanId, contributionRatePlanChargeId) <- ZIO.fromEither(
          getRecurringContributionRatePlanId(stage, billingPeriod),
        )

        overrideAmount = 5

        chargeOverride = ChargeOverrides(
          price = Some(overrideAmount),
          productRatePlanChargeId = contributionRatePlanChargeId,
        )
        addRatePlan = AddRatePlan(date, contributionRatePlanId, chargeOverrides = List(chargeOverride))
        removeRatePlan = RemoveRatePlan(date, currentRatePlans.map(ratePlan => ratePlan.id))
      } yield (List(addRatePlan), List(removeRatePlan))

    def doUpdate(
        subscriptionName: SubscriptionName,
        price: BigDecimal,
        previousAmount: BigDecimal,
        billingPeriod: BillingPeriod,
        currency: Currency,
        currentRatePlans: List[GetSubscription.RatePlan],
        subscription: GetSubscription.GetSubscriptionResponse,
        csrUserId: Option[String],
        caseId: Option[String],
    ): ZIO[GetAccount with SubscriptionUpdate with SQS with Stage, String, OutputBody] = for {
      _ <- ZIO.log("Performing product move update")
      stage <- ZIO.service[Stage]
      account <- GetAccount.get(subscription.accountNumber).addLogMessage("GetAccount")

      identityId <- ZIO
        .fromOption(account.basicInfo.IdentityId__c)
        .orElseFail(s"identityId is null for subscription name ${subscriptionName.value}")

      updateRequestBody <- getRatePlans(billingPeriod, currency, currentRatePlans).map {
        case (addRatePlan, removeRatePlan) =>
          SubscriptionUpdateRequest(add = addRatePlan, remove = removeRatePlan, targetDate = targetDate)
      }

      _ <- SubscriptionUpdate
        .update[SubscriptionUpdateResponse](SubscriptionName(subscription.id), updateRequestBody)
        .addLogMessage("SubscriptionUpdate")

      todaysDate <- Clock.currentDateTime.map(_.toLocalDate)
      billingPeriodValue <- billingPeriod.value

      paidAmount = 0

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
