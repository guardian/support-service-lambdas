package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetAccountSummaryEffectsTest extends FlatSpec with Matchers {

  it should "get account summary" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetAccount(zuoraDeps.get[ZuoraAccount])(ZuoraAccountId("2c92c0f860017cd501600893130317a7")).toDisjunction
    } yield res
    val expected = AccountSummary(
      identityId = IdentityId("30000549"),
      paymentMethodId = PaymentMethodId("2c92c0f860017cd501600893132117ae"),
      autoPay = AutoPay(true),
      accountBalanceMinorUnits = AccountBalanceMinorUnits(0)
    )
    actual shouldBe \/-(expected)
  }
}
