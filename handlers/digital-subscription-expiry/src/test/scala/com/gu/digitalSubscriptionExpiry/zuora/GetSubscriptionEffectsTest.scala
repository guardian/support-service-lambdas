package com.gu.digitalSubscriptionExpiry.zuora

import java.io

import com.gu.digitalSubscriptionExpiry.Expiry
import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{RatePlan, SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.{Config, Stage}
import org.joda.time.format.DateTimeFormat
import org.joda.time.{DateTime, LocalDate}
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

    val dateFormatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    def asDate(str: String) = dateFormatter.parseLocalDate(str)

    val customerAcceptanceDate = asDate("15/12/2017")
    val startDate = asDate("29/11/2017")
    val bla = asDate("29/11/2017")

    val expected = SubscriptionResult(
      testSubscriptionId,
      SubscriptionName("2c92c0f860017cd501600893134617b3"),
      AccountId("2c92c0f860017cd501600893130317a7"),
      None,
      customerAcceptanceDate,
      startDate,
      startDate.plusYears(1),
      List(
        RatePlan(
          ratePlanName = "30% off for 3 months",
          effectiveStartDate = asDate("15/12/2015"),
          effectiveEndDate = asDate("15/03/2015")
        ),
        RatePlan(
          ratePlanName = "Digital Pack Monthly",
          effectiveStartDate = asDate("15/12/2017"),
          effectiveEndDate = asDate("29/11/2018")
        )
      )
    )

    actual should be(\/-(expected))
  }
}
