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

  case class AmountLimits(min: Int, max: Int = 16600)

  def limitsFor(currency: Currency) = currency match {
    case GBP => AmountLimits(min = 200)
    case AUD => AmountLimits(200)
    case USD => AmountLimits(200)
    case NZD => AmountLimits(1000)
    case CAD => AmountLimits(500)
    case EUR => AmountLimits(200)
  }

}

