package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation

object ValidateRequest {

  case class ValidatableFields(
    amountMinorUnits: AmountMinorUnits,
    startDate: LocalDate
  )

  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
    limitsFor: Currency => AmountLimits
  )(
    validatableFields: ValidatableFields,
    currency: Currency
  ): ValidationResult[Unit] =
    for {
      _ <- isValidStartDate(validatableFields.startDate)
      limits = limitsFor(currency)
      _ <- (validatableFields.amountMinorUnits.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (validatableFields.amountMinorUnits.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield ()
}

