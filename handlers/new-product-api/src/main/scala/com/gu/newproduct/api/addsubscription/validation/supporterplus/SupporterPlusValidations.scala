package com.gu.newproduct.api.addsubscription.validation.supporterplus

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.validation.{ValidationResult}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}

object SupporterPlusValidations {

  case class ValidatableFields(amountMinorUnits: Option[AmountMinorUnits], startDate: LocalDate)

  //TODO ensure upper threshold is being applied
  //TODO format amount in response

  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
    limitsFor: (PlanId, Currency) => AmountLimits
  )(
    validatableFields: ValidatableFields,
    planId: PlanId,
    currency: Currency
  ): ValidationResult[AmountMinorUnits] =
    for {
      amount <- validatableFields.amountMinorUnits getOrFailWith s"amountMinorUnits is missing"
      _ <- isValidStartDate(validatableFields.startDate)
      limits = limitsFor(planId, currency)
      _ <- (amount.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (amount.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield (amount)
}
