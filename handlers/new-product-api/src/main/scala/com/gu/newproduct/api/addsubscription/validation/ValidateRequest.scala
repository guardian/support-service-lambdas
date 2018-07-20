package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.util.reader.Types._
import Validation.BooleanValidation
import com.gu.i18n.Currency

object ValidateRequest {
  def apply(
    now: () => LocalDate,
    limitsFor: Currency => AmountLimits
  )(
    addSubscriptionRequest: AddSubscriptionRequest,
    currency: Currency
  ): ApiGatewayOp[Unit] =
    for {
      _ <- (addSubscriptionRequest.startDate == now()) ifFalseReturn "start date must be today"
      limits = limitsFor(currency)
      _ <- (addSubscriptionRequest.amountMinorUnits <= limits.max) ifFalseReturn s"amount must not be more than ${limits.max}"
      _ <- (addSubscriptionRequest.amountMinorUnits >= limits.min) ifFalseReturn s"amount must be at least ${limits.min}"
    } yield ()

}

