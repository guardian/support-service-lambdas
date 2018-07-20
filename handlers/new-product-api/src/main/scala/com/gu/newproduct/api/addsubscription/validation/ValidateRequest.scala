package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDateTime

import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.util.reader.Types._
import Validation.BooleanValidation
import com.gu.i18n.Currency
import com.gu.i18n.Currency._

object ValidateRequest {
  def apply(
    now: () => LocalDateTime
  )(
    addSubscriptionRequest: AddSubscriptionRequest,
    currency: Currency
  ): ApiGatewayOp[Unit] =
    for {
      _ <- (addSubscriptionRequest.startDate == now().toLocalDate) ifFalseReturn "start date must be today"
      limits = limitsFor(currency)
      _ <- (addSubscriptionRequest.amountMinorUnits <= limits.max) ifFalseReturn s"amount must not be more than ${limits.max}"
      _ <- (addSubscriptionRequest.amountMinorUnits >= limits.min) ifFalseReturn s"amount must be at least ${limits.min}"
    } yield ()

  case class AmountLimits(min: Int, max: Int)

  def limitsFor(currency: Currency) = currency match {
    case GBP => AmountLimits(min = 200, max = 16600)
    case AUD => AmountLimits(min = 200, max = 16600)
    case USD => AmountLimits(min = 200, max = 16600)
    case NZD => AmountLimits(min = 1000, max = 16600)
    case CAD => AmountLimits(min = 500, max = 16600)
    case EUR => AmountLimits(min = 200, max = 16600)
  }

}

