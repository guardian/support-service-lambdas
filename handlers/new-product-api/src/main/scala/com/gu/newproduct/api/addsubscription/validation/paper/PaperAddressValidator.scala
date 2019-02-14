package com.gu.newproduct.api.addsubscription.validation.paper

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.{Passed, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Postcode, SoldToAddress}
import com.gu.newproduct.api.productcatalog.{HomeDeliveryPlanId, PlanId}

object PaperAddressValidator {
  def apply(planId: PlanId, soldToAddress: SoldToAddress): ValidationResult[Unit] = {
    for {
      _ <- (soldToAddress.country == Country.UK) orFailWith s"Invalid country: ${soldToAddress.country.name}, only UK addresses are allowed"
      - <- postCodeValidationFor(planId)(soldToAddress.postcode)
    } yield soldToAddress
  }

  def postCodeValidationFor(planId: PlanId): Option[Postcode] => ValidationResult[Any] = planId match {
    case _: HomeDeliveryPlanId => validatePostCodeForHomeDelivery _
    case _ => postCode: Option[Postcode] => Passed(())
  }

  def validatePostCodeForHomeDelivery(postcode: Option[Postcode]): ValidationResult[Postcode] = for {
    deliveryPostcode <- postcode getOrFailWith ("delivery postcode is required")
    _ <- isWithinM25(deliveryPostcode) orFailWith (s"Invalid postcode ${deliveryPostcode.value}: postcode must be within M25")
  } yield (deliveryPostcode)

  def isWithinM25(postcode: Postcode): Boolean = {
    val normalisedPostCode = postcode.value.toUpperCase.filterNot(_.isWhitespace)
    M25_POSTCODE_PREFIXES.exists(normalisedPostCode.startsWith(_))
  }

  val M25_POSTCODE_PREFIXES = List(
    "BR1", "BR2", "BR3", "BR4", "BR5", "BR6", "BR7", "BR8",
    "CM14",
    "CR0", "CR2", "CR3", "CR4", "CR5", "CR6", "CR7", "CR8", "CR9",
    "DA1", "DA5", "DA6", "DA7", "DA8",
    "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9",
    "EC1", "EC2", "EC3", "EC4",
    "EN1", "EN2", "EN3", "EN4", "EN5",
    "HA0", "HA1", "HA2", "HA3", "HA4", "HA5", "HA6", "HA7", "HA8", "HA9",
    "IG1", "IG2", "IG3", "IG5", "IG6", "IG7", "IG8", "IG9",
    "KT1", "KT2", "KT3", "KT4", "KT5", "KT6", "KT7", "KT8", "KT9",
    "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9",
    "NW1", "NW2", "NW3", "NW4", "NW5", "NW6", "NW7", "NW8", "NW9",
    "RM1", "RM2", "RM3", "RM4", "RM5", "RM6", "RM7", "RM8", "RM9",
    "SE1", "SE2", "SE3", "SE4", "SE5", "SE6", "SE7", "SE8", "SE9",
    "SM1", "SM2", "SM3", "SM4", "SM5", "SM6", "SM7",
    "SW1", "SW2", "SW3", "SW4", "SW5", "SW6", "SW7", "SW8", "SW9",
    "TN16",
    "TW1", "TW2", "TW3", "TW4", "TW5", "TW6", "TW7", "TW8", "TW9",
    "UB1", "UB3", "UB4", "UB5", "UB6", "UB7", "UB8", "UB9",
    "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9",
    "WC1", "WC2",
    "WD1", "WD2", "WD3", "WD4", "WD5", "WD6", "WD7"
  )

}
