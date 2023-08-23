package com.gu.newproduct.api.addsubscription.email.digipack

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.ValidationResult
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._

case class ValidatedAddress(
    address1: Address1,
    address2: Option[Address2],
    city: City,
    state: Option[State],
    country: Country,
    postcode: Postcode,
)

object DigipackAddressValidator {
  def apply(address: BillToAddress): ValidationResult[ValidatedAddress] = {
    for {
      validatedAddress1 <- validateNotEmpty("address1", address.address1)
      validatedCity <- validateNotEmpty("city", address.city)
      validatedPostcode <- validateNotEmpty("postcode", address.postcode)
      validatedCountry <- address.country getOrFailWith "bill to country must be populated"
    } yield ValidatedAddress(
      validatedAddress1,
      address.address2,
      validatedCity,
      address.state,
      validatedCountry,
      validatedPostcode,
    )
  }

  def validateNotEmpty[Field <: AddressField](
      fieldName: String,
      maybeAddressField: Option[Field],
  ): ValidationResult[Field] = for {
    addressField <- maybeAddressField getOrFailWith (s"bill to $fieldName must be populated")
    _ <- !addressField.value.trim.isEmpty orFailWith s"bill to $fieldName must be populated"
  } yield addressField

}
