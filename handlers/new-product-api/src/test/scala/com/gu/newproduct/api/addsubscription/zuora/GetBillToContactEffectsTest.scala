package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.WireModel.GetBillToResponse
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.{apply => _, _}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetBillToContactEffectsTest extends FlatSpec with Matchers {

  it should "get contacts for account from Zuora" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetBillToContact(zuoraDeps.get[GetBillToResponse])(ZuoraAccountId("2c92c0f860017cd501600893130317a7")).toDisjunction
    } yield res

    val expected = Contact(FirstName("Dory"), LastName("Jones"), Some(Email("fake@fake.co.us")), Some(Country.Canada))

    actual shouldBe \/-(expected)
  }
}
