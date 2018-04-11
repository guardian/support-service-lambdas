package com.gu.digitalSubscriptionExpiry.zuora

import java.io

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlan, SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.{Config, Stage}
import org.joda.time.DateTime
import org.scalatest.{FlatSpec, Matchers}

import scalaz.{\/, \/-}
import scalaz.syntax.std.either._

class GetSubscriptionEffectsTest extends FlatSpec with Matchers {
  it should "successfully get subscription info against dev" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("A-S00044160")

    val actual: \/[io.Serializable, SubscriptionResult] = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      deps: ZuoraDeps = ZuoraDeps(RawEffects.createDefault.response, config.stepsConfig.zuoraRestConfig)
      subscription <- GetSubscription(deps)(testSubscriptionId)
    } yield {
      subscription
    }

    val customerAcceptanceDate = new DateTime().withYear(2017).withMonthOfYear(12).withDayOfMonth(15).withTimeAtStartOfDay()
    val startDate = new DateTime().withYear(2017).withMonthOfYear(11).withDayOfMonth(29).withTimeAtStartOfDay()
    val expected = SubscriptionResult(
      testSubscriptionId,
      SubscriptionName("2c92c0f860017cd501600893134617b3"),
      AccountId("2c92c0f860017cd501600893130317a7"),
      None,
      Some(customerAcceptanceDate),
      Some(startDate),
      Some(startDate.plusYears(1)),
      List(RatePlan("30% off for 3 months"), RatePlan("Digital Pack Monthly"))
    )

    actual should be(\/-(expected))
  }
}
