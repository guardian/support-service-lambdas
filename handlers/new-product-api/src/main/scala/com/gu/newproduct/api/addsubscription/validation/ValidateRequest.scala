package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation

object ValidateRequest {
  def apply(
    isValidStartDate: LocalDate => ValidationResult[Unit],
    limitsFor: Currency => AmountLimits
  )(
    addSubscriptionRequest: AddSubscriptionRequest,
    currency: Currency
  ): ValidationResult[Unit] =
    for {
      _ <- isValidStartDate(addSubscriptionRequest.startDate)
      limits = limitsFor(currency)
      _ <- (addSubscriptionRequest.amountMinorUnits.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (addSubscriptionRequest.amountMinorUnits.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield ()
}

