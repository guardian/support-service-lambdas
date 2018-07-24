package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation

object ValidateRequest {
  def apply(
    now: () => LocalDate,
    limitsFor: Currency => AmountLimits
  )(
    addSubscriptionRequest: AddSubscriptionRequest,
    currency: Currency
  ): ValidationResult[Unit] =
    for {
      _ <- (addSubscriptionRequest.startDate == now()) orFailWith "start date must be today"
      limits = limitsFor(currency)
      _ <- (addSubscriptionRequest.amountMinorUnits <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (addSubscriptionRequest.amountMinorUnits >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield ()
}

