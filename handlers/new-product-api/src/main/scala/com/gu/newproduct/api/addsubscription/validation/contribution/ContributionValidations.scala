package com.gu.newproduct.api.addsubscription.validation.contribution

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.validation.{AmountLimits, ValidationResult}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}
object ContributionValidations {

  case class ValidatableFields(
      amountMinorUnits: Option[AmountMinorUnits],
      startDate: LocalDate,
  )

  def apply(
      isValidStartDate: LocalDate => ValidationResult[Unit],
      limitsFor: (PlanId, Currency) => AmountLimits,
  )(
      validatableFields: ValidatableFields,
      planId: PlanId,
      currency: Currency,
  ): ValidationResult[AmountMinorUnits] =
    for {
      amount <- validatableFields.amountMinorUnits getOrFailWith s"amountMinorUnits is missing"
      _ <- isValidStartDate(validatableFields.startDate)
      limits = limitsFor(planId, currency)
      _ <- (amount.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (amount.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield (amount)
}
