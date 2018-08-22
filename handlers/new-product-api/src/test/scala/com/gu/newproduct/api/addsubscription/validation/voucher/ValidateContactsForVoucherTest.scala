package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import org.scalatest.{FlatSpec, Matchers}

class ValidateContactsForVoucherTest extends FlatSpec with Matchers {

  val testContacts = Contacts(
    billTo = BillToContact(
      None,
      FirstName("billToName"),
      LastName("billToLastName"),
      None,
      BillToAddress(None, None, None, None, None, None)
    ),
    soldTo = SoldToContact(
      None,
      FirstName("soldToName"),
      LastName("soldToLastName"),
      Some(Email("work@email.com")),
      SoldToAddress(
        Some(Address1("soldToAddress1")),
        Some(Address2("soldToAddress2")),
        Some(City("soldToCity")),
        Some(State("soldToState")),
        Country.UK,
        Some(Postcode("soldToPostcode"))
      )
    )
  )

  it should "succeed if sold to contact is in UK" in {
    ValidateContactsForVoucher(testContacts) shouldBe Passed(testContacts)
  }

  it should "fail if sold to contact is not uk" in {
    val australianAddress = testContacts.soldTo.address.copy(country = Country.Australia)
    val australianSoldToContacts = testContacts.copy(soldTo = testContacts.soldTo.copy(address = australianAddress))
    ValidateContactsForVoucher(australianSoldToContacts) shouldBe Failed("Invalid country: Australia, only UK addresses are allowed")
  }
}
