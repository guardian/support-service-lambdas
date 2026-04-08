package com.gu.newproduct.api.addsubscription.email.digipack

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.ValidationResult
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._

case class ValidatedAddress(
    address1: Option[Address1],
    address2: Option[Address2],
    city: Option[City],
    state: Option[State],
    country: Country,
    postcode: Option[Postcode],
)

object DigipackAddressValidator {
  def apply(address: BillToAddress): ValidationResult[ValidatedAddress] = {
    for {
      validatedCountry <- address.country getOrFailWith "Billing country must be populated in Zuora"
    } yield ValidatedAddress(
      address.address1,
      address.address2,
      address.city,
      address.state,
      validatedCountry,
      address.postcode,
    )
  }
}
