package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import org.scalatest.{FlatSpec, Matchers}

class ValidateContactsForVoucherTest extends FlatSpec with Matchers {

  val testContacts = Contacts(
    billTo = BilltoContact(
      FirstName("billToName"),
      LastName("billToLastName"),
      None,
      Some(Country.US)
    ),
    soldTo = SoldToContact(
      FirstName("soldToName"),
      LastName("soldToLastName"),
      Some(Email("work@email.com")),
      Country.UK
    )
  )

  it should "succeed if sold to contact is in UK" in {
    ValidateContactsForVoucher(testContacts) shouldBe Passed(testContacts)
  }

  it should "fail if sold to contact is not uk" in {
    val australianSoldToContacts = testContacts.copy(
      soldTo = testContacts.soldTo.copy(country = Country.Australia)
    )
    ValidateContactsForVoucher(australianSoldToContacts) shouldBe Failed("Invalid country: Australia, only UK addresses are allowed")
  }
}
