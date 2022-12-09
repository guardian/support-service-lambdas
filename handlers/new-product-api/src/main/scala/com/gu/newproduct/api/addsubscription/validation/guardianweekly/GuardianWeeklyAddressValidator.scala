package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.i18n.{Country, CountryGroup}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.ValidationResult
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.GuardianWeeklyAddressValidator.{
  isDomesticDeliveryCountry,
  validateBillingAddress,
}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}

object GuardianWeeklyDomesticAddressValidator {
  def apply(billToAddress: BillToAddress, soldToAddress: SoldToAddress): ValidationResult[Unit] =
    for {
      _ <- isDomesticDeliveryCountry(soldToAddress.country).orFailWith(
        errorMessage =
          s"Delivery address country ${soldToAddress.country.name} is not valid for a Guardian Weekly (Domestic) " +
            s"subscription",
      )
      _ <- validateBillingAddress(billToAddress)
    } yield (())
}

object GuardianWeeklyROWAddressValidator {
  def apply(billToAddress: BillToAddress, soldToAddress: SoldToAddress): ValidationResult[Unit] =
    for {
      _ <- (!isDomesticDeliveryCountry(soldToAddress.country)).orFailWith(
        errorMessage =
          s"Delivery address country ${soldToAddress.country.name} is not valid for a Guardian Weekly (ROW) " +
            s"subscription",
      )
      _ <- validateBillingAddress(billToAddress)
    } yield (())
}

object GuardianWeeklyAddressValidator {
  val domesticCountries =
    CountryGroup.Australia.countries ++
      CountryGroup.Canada.countries ++
      CountryGroup.Europe.countries ++
      CountryGroup.NewZealand.countries ++
      CountryGroup.UK.countries ++
      CountryGroup.US.countries

  def isDomesticDeliveryCountry(country: Country) = !CountryGroup.RestOfTheWorld.countries.contains(country)

  def validateBillingAddress(billToAddress: BillToAddress): ValidationResult[Unit] = {
    for {
      _ <- billToAddress.address1 getOrFailWith ("bill to address1 must be populated")
      _ <- billToAddress.city getOrFailWith ("bill to city must be populated")
      _ <- billToAddress.postcode getOrFailWith ("bill to postcode must be populated")
      _ <- billToAddress.country getOrFailWith ("bill to country must be populated")
    } yield (())
  }
}
