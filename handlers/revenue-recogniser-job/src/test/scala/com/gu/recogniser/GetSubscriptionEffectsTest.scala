package com.gu.recogniser

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.recogniser.GetSubscription.GetSubscriptionResponse
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class GetSubscriptionEffectsTest extends AnyFlatSpec with Matchers {

  it should "get a subscription that hasn't been redeemed" taggedAs EffectsTest in {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subscription <- GetSubscription(zuoraDeps)
        .execute("A-S00102333")
        .toDisjunction
        .left
        .map(httpError => new RuntimeException(httpError.toString))
    } yield subscription
    println("result: " + actual)
    actual should be(Right(GetSubscriptionResponse(None, false, LocalDate.of(2021, 10, 28), 12, "Month")))

  }

  it should "get a subscription that's been redeemed" taggedAs EffectsTest in {

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subscription <- GetSubscription(zuoraDeps)
        .execute("A-S00102334")
        .toDisjunction
        .left
        .map(httpError => new RuntimeException(httpError.toString))
    } yield subscription
    println("result: " + actual)
    actual should be(
      Right(GetSubscriptionResponse(Some(LocalDate.of(2021, 6, 29)), true, LocalDate.of(2021, 10, 28), 12, "Month")),
    )

  }

}
