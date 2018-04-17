package com.gu.digitalSubscriptionExpiry.zuora

import java.io

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraRestRequestMaker
import com.gu.util.{Config, Stage}
import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import org.scalatest.{FlatSpec, Matchers}
import scalaz.syntax.std.either._
import scalaz.{\/, \/-}

class UpdateSubscriptionEffectsTest extends FlatSpec with Matchers {
  it should "update the activation date on the subscription if it doesn't exist" taggedAs EffectsTest in {
    //    val testSubscriptionId = SubscriptionId("A-S00044964")

    val testDate = LocalDate.now()
    val testSubscriptionId = SubscriptionId("A-S00044987")
    val testSub = SubscriptionResult(
      id = testSubscriptionId,
      name = SubscriptionName("sub name"),
      accountId = AccountId("blah"),
      casActivationDate = Some("anything at all"),
      startDate = testDate,
      endDate = testDate,
      customerAcceptanceDate = testDate,
      ratePlans = Nil
    )
    //    val now = LocalDate.now()
    val actual: \/[io.Serializable, Unit] = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)

      zuoraRequests = ZuoraRestRequestMaker(RawEffects.createDefault.response, config.stepsConfig.zuoraRestConfig)
      update <- UpdateSubscription(zuoraRequests)(testSub)
    } yield {
      update
    }

    actual should be(\/-(()))
  }
}
