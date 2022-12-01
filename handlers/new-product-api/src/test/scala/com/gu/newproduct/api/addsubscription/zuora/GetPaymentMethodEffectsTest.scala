package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod._
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCardReferenceTransaction
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetPaymentMethodEffectsTest extends AnyFlatSpec with Matchers {

  it should "get payment details" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetPaymentMethod(zuoraDeps.get[PaymentMethodWire])(PaymentMethodId("8ad095dd82f7aaa50182f96de2883de1")).toDisjunction
    } yield {
      res
    }
    actual shouldBe Right(NonDirectDebitMethod(ActivePaymentMethod, CreditCardReferenceTransaction))
  }
}

