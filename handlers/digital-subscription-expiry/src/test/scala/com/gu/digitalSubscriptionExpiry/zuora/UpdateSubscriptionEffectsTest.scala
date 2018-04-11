package com.gu.digitalSubscriptionExpiry.zuora

import java.io

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionId
import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.{Config, Stage}
import org.joda.time.DateTime
import org.scalatest.{FlatSpec, Matchers}

import scalaz.syntax.std.either._
import scalaz.{\/, \/-}

class UpdateSubscriptionEffectsTest extends FlatSpec with Matchers {
  it should "update the activation date on the subscription if it exists" taggedAs EffectsTest in {
    val testSubscriptionId = SubscriptionId("A-S00044964")

    val now = DateTime.now()
    val actual: \/[io.Serializable, Unit] = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      deps: ZuoraDeps = ZuoraDeps(RawEffects.createDefault.response, config.stepsConfig.zuoraRestConfig)
      update <- UpdateSubscription(deps)(testSubscriptionId, now.toString)
    } yield {
      update
    }

    actual should be(\/-(()))
  }
}
