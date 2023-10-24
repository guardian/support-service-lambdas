package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{
  RatePlan,
  RatePlanCharge,
  SubscriptionId,
  SubscriptionName,
  SubscriptionResult,
}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSubscriptionEffectsTest extends AnyFlatSpec with Matchers {

  private def actual(testSubscriptionId: SubscriptionId): ApiGatewayOp[SubscriptionResult] = for {
    zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[ZuoraRestConfig]
      .toApiGatewayOp("couldn't load config")
    zuoraRequests = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
    subscription <- GetSubscription(zuoraRequests)(testSubscriptionId)
  } yield {
    subscription
  }

  it should "return not found if sub id is invalid" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("invalidSubId")

    actual(testSubscriptionId).toDisjunction should be(Left(notFoundResponse))
  }

  it should "successfully get subscription info against dev" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("A-S00044160")

    val customerAcceptanceDate = LocalDate.of(2017, 12, 15)
    val startDate = LocalDate.of(2019, 11, 29)
    val expected = SubscriptionResult(
      testSubscriptionId,
      SubscriptionName("2c92c0856eb600ac016eb68ca2727298"),
      AccountId("2c92c0f860017cd501600893130317a7"),
      Some("2018-04-18T14:59:49.368"),
      customerAcceptanceDate,
      startDate,
      startDate.plusYears(1),
      List(
        RatePlan(
          "Promotions",
          List(
            RatePlanCharge(
              name = "Discount template",
              effectiveStartDate = LocalDate.of(2017, 12, 15),
              effectiveEndDate = LocalDate.of(2018, 3, 15),
            ),
          ),
        ),
        RatePlan(
          "Digital Pack",
          List(
            RatePlanCharge(
              name = "Digital Pack Monthly",
              effectiveStartDate = LocalDate.of(2017, 12, 15),
              effectiveEndDate = LocalDate.of(2020, 11, 29),
            ),
          ),
        ),
      ),
    )

    actual(testSubscriptionId).toDisjunction should be(Right(expected))
  }
}
