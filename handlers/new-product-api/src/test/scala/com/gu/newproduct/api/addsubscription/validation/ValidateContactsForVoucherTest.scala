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
}
