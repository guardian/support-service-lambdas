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
    "CR0", "CR2", "CR3", "CR4", "CR5", "CR6", "CR7", "CR8", "CR9",
    "DA1", "DA14", "DA15", "DA16", "DA18", "DA5", "DA7", "DA8", "DA17",
    "E1", "E10", "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18", "E20", "E1W", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E98",
    "EC1A", "EC1M", "EC1N", "EC1R", "EC1V", "EC1Y", "EC2A", "EC2M", "EC2N", "EC2R", "EC2V", "EC2Y", "EC3A", "EC3M", "EC3N", "EC3P", "EC3R", "EC3V", "EC4A", "EC4M", "EC4N", "EC4P", "EC4R", "EC4V","EC4Y",
    "EN1", "EN2", "EN3", "EN4", "EN5",
    "HA0", "HA1", "HA2", "HA3", "HA4", "HA5", "HA6", "HA7", "HA8", "HA9",
    "IG1", "IG10", "IG11", "IG2", "IG3", "IG5", "IG6", "IG7", "IG8", "IG9",
    "KT1", "KT10", "KT11", "KT12", "KT13", "KT14", "KT15", "KT16", "KT17", "KT18", "KT19", "KT2", "KT20", "KT21", "KT3", "KT4", "KT5", "KT6", "KT7", "KT8", "KT9",
    "N1", "N10", "N11", "N12", "N13", "N14", "N15", "N16", "N17", "N18", "N19", "N2", "N20", "N21", "N22", "N3", "N4", "N5", "N6", "N7", "N8", "N9",
    "NW1", "NW10", "NW11", "NW2", "NW3", "NW4", "NW5", "NW6", "NW7", "NW8", "NW9",
    "RM1", "RM10", "RM11", "RM12", "RM13", "RM14", "RM2", "RM3", "RM4", "RM6", "RM7", "RM8",
    "SE1", "SE10", "SE11", "SE12", "SE13", "SE14", "SE15", "SE16", "SE17", "SE18", "SE19",
    "SE2", "SE20", "SE21", "SE22", "SE23", "SE24", "SE25", "SE26", "SE27", "SE28", "SE3", "SE4", "SE5", "SE6", "SE7", "SE8", "SE9",
    "SM1", "SM2", "SM3", "SM4", "SM5", "SM6", "SM7",
    "SW1", "SW10", "SW11", "SW12", "SW13", "SW14", "SW15", "SW16", "SW17", "SW18", "SW19",
    "SW1A", "SW1V", "SW1E", "SW1H", "SW1P", "SW1W", "SW1X", "SW1Y",
    "SW2", "SW20", "SW3", "SW4", "SW5", "SW6", "SW7", "SW8", "SW9",
    "TW1", "TW10", "TW11", "TW12", "TW13", "TW14", "TW15", "TW16", "TW17", "TW18", "TW19",
    "TW2", "TW20", "TW3", "TW4", "TW5", "TW6", "TW7", "TW8", "TW9",
    "UB1", "UB10", "UB11", "UB2", "UB3", "UB4", "UB5", "UB6", "UB7", "UB8", "UB9",
    "W1", "W10", "W11", "W12", "W13", "W14", "W1A", "W1B", "W1C", "W1D", "W1F", "W1G", "W1H", "W1J", "W1K", "W1M", "W1N", "W1P", "W1R", "W1S", "W1T", "W1U", "W1V", "W1W", "W1X", "W1Y",
    "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9",
    "WC1", "WC1A", "WC1B", "WC1E", "WC1H", "WC1N", "WC1R", "WC1V", "WC1X", "WC2", "WC2A", "WC2B", "WC2E", "WC2H", "WC2N", "WC2R",
    "WD1", "WD17", "WD18", "WD19", "WD23", "WD24", "WD25", "WD3", "WD4", "WD5", "WD6", "WD7",
    "TN16"
  )

}
