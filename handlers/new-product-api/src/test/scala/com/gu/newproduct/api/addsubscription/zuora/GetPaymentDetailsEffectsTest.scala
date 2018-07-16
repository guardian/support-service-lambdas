package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodDetails.{Active, PaymentMethodDetails}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetPaymentDetailsEffectsTest extends FlatSpec with Matchers {

  it should "get payment details" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetPaymentMethodDetails(zuoraDeps)("2c92c0f8649cc8a60164a2bfd475000c")
    } yield {
      res
    }
    actual shouldBe \/-(PaymentMethodDetails(Active))
  }
}

