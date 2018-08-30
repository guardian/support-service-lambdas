package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts

object ValidateContactsForVoucher {
  def apply(contacts: Contacts): ValidationResult[Contacts] = {
    if (contacts.soldTo.address.country == Country.UK)
      Passed(contacts)
    else
      Failed(s"Invalid country: ${contacts.soldTo.address.country.name}, only UK addresses are allowed")
  }
}
