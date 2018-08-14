package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import com.gu.newproduct.api.addsubscription.validation.Validation._

object ValidateRequest {

  case class ValidatableFields(
    amountMinorUnits: Option[AmountMinorUnits],
    startDate: LocalDate
  )

  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
    limitsFor: Currency => AmountLimits
  )(
    validatableFields: ValidatableFields,
    currency: Currency
  ): ValidationResult[AmountMinorUnits] =
    for {
      amount <- validatableFields.amountMinorUnits getOrFailWith s"amount is missing"
      _ <- isValidStartDate(validatableFields.startDate)
      limits = limitsFor(currency)
      _ <- (amount.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (amount.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield (amount)
}

