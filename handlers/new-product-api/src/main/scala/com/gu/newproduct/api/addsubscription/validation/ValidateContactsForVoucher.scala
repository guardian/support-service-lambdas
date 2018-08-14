package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts

//TODO should we check here that we have a full uk address or should we just check the country is uk and nothing else?

object ValidateContactsForVoucher {
  def apply(contacts: Contacts): ValidationResult[Contacts] = {
    for {
      deliveryCountry <- contacts.soldTo.country getOrFailWith ("No country in zuora sold to contact")
      _ <- deliveryCountry == Country.UK orFailWith (s"Invalid country: ${deliveryCountry.name}, only UK addresses are allowed")
    } yield contacts
  }
}

