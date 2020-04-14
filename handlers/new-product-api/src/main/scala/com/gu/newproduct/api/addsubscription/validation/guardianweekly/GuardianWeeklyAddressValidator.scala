package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.ValidationResult
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.GuardianWeeklyAddressValidator.{isDomesticDeliveryCountry, validateBillingAddress}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}

object GuardianWeeklyDomesticAddressValidator {
  def apply(billToAddress: BillToAddress, soldToAddress: SoldToAddress): ValidationResult[Unit] =
    for {
      _ <- isDomesticDeliveryCountry(soldToAddress.country).orFailWith(
        errorMessage =
          s"Delivery address country ${soldToAddress.country.name} is not valid for a Guardian Weekly (Domestic) " +
            s"subscription"
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
            s"subscription"
      )
      _ <- validateBillingAddress(billToAddress)
    } yield (())
}

object GuardianWeeklyAddressValidator {
  def isDomesticDeliveryCountry(country: Country) = !internationalCountryCodes.contains(country.alpha2)

  def validateBillingAddress(billToAddress: BillToAddress) = {
    for {
      _ <- billToAddress.address1 getOrFailWith ("bill to address1 must be populated")
      _ <- billToAddress.city getOrFailWith ("bill to city must be populated")
      _ <- billToAddress.postcode getOrFailWith ("bill to postcode must be populated")
      _ <- billToAddress.country getOrFailWith ("bill to country must be populated")
    } yield (())
  }

  val domesticCountryCodes = List(
    "GB", "FK", "GI", "GG", "IM", "JE", "SH", "US", "AU", "KI", "NR", "NF", "TV", "AD", "AL", "AT", "BA", "BE", "BG",
    "BL", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FO", "FR", "GF", "GL", "GP", "GR", "HR", "HU", "IE", "IT",
    "LI", "LT", "LU", "LV", "MC", "ME", "MF", "IS", "MQ", "MT", "NL", "NO", "PF", "PL", "PM", "PT", "RE", "RO", "RS",
    "SE", "SI", "SJ", "SK", "SM", "TF", "TR", "WF", "YT", "VA", "AX"
  )

  val internationalCountryCodes = List(
    "AE", "AF", "AG", "AI", "AM", "AO", "AQ", "AR", "AS", "AW", "AZ", "BB", "BD", "BF", "BH", "BI", "BJ", "BM", "BN",
    "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CC", "CD", "CF", "CG", "CI", "CL", "CM", "CN", "CO", "CR",
    "CU", "CV", "CW", "CX", "DJ", "DM", "DO", "DZ", "EC", "EG", "EH", "ER", "ET", "FJ", "FM", "GA", "GD", "GE", "GH",
    "GM", "GN", "GQ", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HT", "ID", "IL", "IN", "IO", "IQ", "IR", "JM",
    "JO", "JP", "KE", "KG", "KH", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LK", "LR", "LS", "LY",
    "MA", "MD", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MR", "MS", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
    "NC", "NE", "NG", "NI", "NP", "NU", "OM", "PA", "PE", "PG", "PH", "PK", "PN", "PR", "PS", "PW", "PY", "QA", "RU",
    "RW", "SA", "SB", "SC", "SD", "SG", "SL", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TG",
    "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TT", "TW", "TZ", "UA", "UG", "UM", "UY", "UZ", "VC", "VE", "VG", "VI",
    "VN", "VU", "WS", "YE", "ZA", "ZM", "ZW"
  )
}
