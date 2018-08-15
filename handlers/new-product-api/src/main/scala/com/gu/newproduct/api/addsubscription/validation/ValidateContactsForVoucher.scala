package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts

//TODO should we check here that we have a full uk address or should we just check the country is uk and nothing else?

object ValidateContactsForVoucher {
  def apply(contacts: Contacts): ValidationResult[Contacts] = {
    if (contacts.soldTo.country == Country.UK)
      Passed(contacts)
    else
      Failed(s"Invalid country: ${contacts.soldTo.country.name}, only UK addresses are allowed")
  }
}

