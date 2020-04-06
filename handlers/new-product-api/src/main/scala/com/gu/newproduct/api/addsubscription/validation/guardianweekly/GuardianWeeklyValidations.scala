package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.ValidationResult
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.AutoPay

object GuardianWeeklyValidations {

  case class ValidatableFields(
    startDate: LocalDate,
    autoPay: AutoPay,
  )

  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
  )(
    validatableFields: ValidatableFields
  ): ValidationResult[Unit] =
    for {
      _ <- isValidStartDate(validatableFields.startDate)
      _ <- validatableFields.autoPay.value orFailWith "Zuora account has autopay disabled"
    } yield (())
}
