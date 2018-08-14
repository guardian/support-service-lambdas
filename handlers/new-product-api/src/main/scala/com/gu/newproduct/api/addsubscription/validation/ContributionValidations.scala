package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.IdentityId

object ContributionValidations {

  case class ValidatableFields(
    amountMinorUnits: Option[AmountMinorUnits],
    startDate: LocalDate,
    identityId: Option[IdentityId]
  )

  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
    limitsFor: Currency => AmountLimits
  )(
    validatableFields: ValidatableFields,
    currency: Currency
  ): ValidationResult[AmountMinorUnits] =
    for {
      _ <- validatableFields.identityId.isDefined orFailWith "Zuora account has no Identity Id"
      amount <- validatableFields.amountMinorUnits getOrFailWith s"amount is missing"
      _ <- isValidStartDate(validatableFields.startDate)
      limits = limitsFor(currency)
      _ <- (amount.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (amount.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield (amount)
}

