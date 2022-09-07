package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{apply => _, _}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetContactsEffectsTest extends AnyFlatSpec with Matchers {

  it should "get contacts for account from Zuora" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetContacts(zuoraDeps.get[GetContactsResponse])(ZuoraAccountId("8ad095dd830721b201830e51862b425b")).toDisjunction
    } yield res

    val expectedBillTo = BillToContact(
      Some(Title("Miss")),
      FirstName("Effects"),
      LastName("Test"),
      Some(Email("effectstest@guardian.co.uk")),
      BillToAddress(
        Some(Address1("flat 7")),
        Some(Address2("1234 fakest street")),
        Some(City("Vancouver")),
        Some(State("British Columbia")),
        Some(Country.Canada),
        Some(Postcode("1234"))
      )
    )

    val expectedSoldTo = SoldToContact(
      Some(Title("Mrs")),
      FirstName("velma"),
      LastName("kelly"),
      Some(Email("velmakelly@test.com")),
      SoldToAddress(
        Some(Address1("123 cold street")),
        None,
        Some(City("lethbridge")),
        None,
        Country.UK,
        Some(Postcode("W134GH"))
      )
    )

    actual shouldBe Right(Contacts(billTo = expectedBillTo, soldTo = expectedSoldTo))
  }
}
