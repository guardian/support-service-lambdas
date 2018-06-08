package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlan, RatePlanCharge, SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestRequestMaker
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class GetSubscriptionEffectsTest extends FlatSpec with Matchers {

  private def actual(testSubscriptionId: SubscriptionId): ApiGatewayOp[SubscriptionResult] = for {
    configAttempt <- S3ConfigLoad.load(Stage("DEV")).toApiGatewayOp("couldn't load")
    config <- LoadConfig.parseConfig[StepsConfig](configAttempt).toApiGatewayOp("couldn't parse")
    zuoraRequests = ZuoraRestRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
    subscription <- GetSubscription(zuoraRequests)(testSubscriptionId)
  } yield {
    subscription
  }

  it should "return not found if sub id is invalid" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("invalidSubId")

    actual(testSubscriptionId).underlying should be(-\/(notFoundResponse))
  }

  it should "successfully get subscription info against dev" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("A-S00044160")

    val customerAcceptanceDate = LocalDate.of(2017, 12, 15)
    val startDate = LocalDate.of(2017, 11, 29)
    val expected = SubscriptionResult(
      testSubscriptionId,
      SubscriptionName("2c92c0f860017cd501600893134617b3"),
      AccountId("2c92c0f860017cd501600893130317a7"),
      Some("2018-04-18T14:59:49.368"),
      customerAcceptanceDate,
      startDate,
      startDate.plusYears(1),
      List(
        RatePlan(
          "Promotions",
          List(RatePlanCharge(
            name = "Discount template",
            effectiveStartDate = LocalDate.of(2017, 12, 15),
            effectiveEndDate = LocalDate.of(2018, 3, 15)
          ))
        ),
        RatePlan(
          "Digital Pack",
          List(RatePlanCharge(
            name = "Digital Pack Monthly",
            effectiveStartDate = LocalDate.of(2017, 12, 15),
            effectiveEndDate = LocalDate.of(2018, 11, 29)
          ))
        )
      )
    )

    actual(testSubscriptionId).underlying should be(\/-(expected))
  }
}
