package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.i18n.Currency._

case class AmountLimits(min: Int, max: Int)

object AmountLimits {
  def limitsFor(currency: Currency): AmountLimits = currency match {
    case GBP => AmountLimits(min = 200, max = 16600)
    case AUD => AmountLimits(min = 200, max = 16600)
    case USD => AmountLimits(min = 200, max = 16600)
    case NZD => AmountLimits(min = 1000, max = 16600)
    case CAD => AmountLimits(min = 500, max = 16600)
    case EUR => AmountLimits(min = 200, max = 16600)
  }
}