package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{apply => _, _}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetContactsEffectsTest extends FlatSpec with Matchers {

  it should "get contacts for account from Zuora" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetContacts(zuoraDeps.get[GetContactsResponse])(ZuoraAccountId("2c92c0f860017cd501600893130317a7")).toDisjunction
    } yield res

    val expectedBillTo = Contact(FirstName("Dory"), LastName("Jones"), Some(Email("fake@fake.co.us")), Some(Country.Canada))
    val expectedSoldTo = Contact(FirstName("velma"), LastName("kelly"), Some(Email("velmakelly@test.com")), Some(Country.UK))

    actual shouldBe \/-(Contacts(billTo = expectedBillTo, soldTo = expectedSoldTo))
  }
}
