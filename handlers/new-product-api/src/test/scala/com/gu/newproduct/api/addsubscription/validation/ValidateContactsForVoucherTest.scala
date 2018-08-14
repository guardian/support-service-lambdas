package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import org.scalatest.{FlatSpec, Matchers}

class ValidateContactsForVoucherTest extends FlatSpec with Matchers {

  val testContacts = Contacts(
    billTo = Contact(
      FirstName("billToName"),
      LastName("billToLastName"),
      None,
      Some(Country.US)
    ),
    soldTo = Contact(
      FirstName("soldToName"),
      LastName("soldToLastName"),
      Some(Email("work@email.com")),
      Some(Country.UK)
    )
  )

  it should "succeed if sold to contact is in UK" in {
    ValidateContactsForVoucher(testContacts) shouldBe Passed(testContacts)
  }

  it should "fail if sold to contact is missing" in { //todo i think this case is impossible in zuora, we should remove the option
    val noSoldToCountryContacts  = testContacts.copy(
      soldTo = testContacts.soldTo.copy(country = None)
    )
    ValidateContactsForVoucher(noSoldToCountryContacts) shouldBe Failed("No country in zuora sold to contact")
  }

  it should "fail if sold to contact is not uk" in {
    val australianSoldToContacts  = testContacts.copy(
      soldTo = testContacts.soldTo.copy(country = Some(Country.Australia))
    )
    ValidateContactsForVoucher(australianSoldToContacts) shouldBe Failed("Invalid country: Australia, only UK addresses are allowed")
  }
}
