package com.gu.digitalSubscriptionExpiry.zuora

import java.io

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraRestRequestMaker
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/
import scalaz.syntax.std.either._

class UpdateSubscriptionEffectsTest extends FlatSpec with Matchers {
  it should "update the activation date on the subscription if it doesn't exist" taggedAs EffectsTest in {

    //test user with a digital pack whose activation date we know we can change
    val testSubscriptionId = SubscriptionId("A-S00044161")

    val subAfterUpdate: \/[io.Serializable, SubscriptionResult] = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)

      zuoraRequests = ZuoraRestRequestMaker(RawEffects.createDefault.response, config.stepsConfig.zuoraRestConfig)
      testSub <- GetSubscription(zuoraRequests)(testSubscriptionId)
      clear <- UpdateSubscription(zuoraRequests)(testSub, null)
      update <- UpdateSubscription(zuoraRequests)(testSub)
      subAfterUpdate <- GetSubscription(zuoraRequests)(testSubscriptionId)
    } yield {
      subAfterUpdate
    }

    subAfterUpdate.map(_.casActivationDate).getOrElse(None) shouldBe defined
  }

  it should "not update the activation date if the subscription already has one" taggedAs EffectsTest in {

    //test user with a digital pack whose activation date we know we can change
    val testSubscriptionId = SubscriptionId("A-S00044161")

    val subsAfterUpdates: \/[io.Serializable, (SubscriptionResult, SubscriptionResult)] = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)

      zuoraRequests = ZuoraRestRequestMaker(RawEffects.createDefault.response, config.stepsConfig.zuoraRestConfig)
      testSub <- GetSubscription(zuoraRequests)(testSubscriptionId)
      clear <- UpdateSubscription(zuoraRequests)(testSub, null)
      update <- UpdateSubscription(zuoraRequests)(testSub) // new date
      subAfterUpdate <- GetSubscription(zuoraRequests)(testSubscriptionId)
      updateAgain <- UpdateSubscription(zuoraRequests)(testSub) //try and add a newer date
      subAfterSecondUpdate <- GetSubscription(zuoraRequests)(testSubscriptionId)
    } yield {
      (subAfterUpdate, subAfterSecondUpdate)
    }
    subsAfterUpdates.map(_._1) shouldBe subsAfterUpdates.map(_._2)
  }
}
