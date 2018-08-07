package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation

object ValidateRequest {
  def apply(
    dateRule: DateRule,
    limitsFor: Currency => AmountLimits
  )(
    addSubscriptionRequest: AddSubscriptionRequest,
    currency: Currency
  ): ValidationResult[Unit] =
    for {
      _ <- dateRule.isValid(addSubscriptionRequest.startDate)
      limits = limitsFor(currency)
      _ <- (addSubscriptionRequest.amountMinorUnits.value <= limits.max) orFailWith s"amount must not be more than ${limits.max}"
      _ <- (addSubscriptionRequest.amountMinorUnits.value >= limits.min) orFailWith s"amount must be at least ${limits.min}"
    } yield ()
}

