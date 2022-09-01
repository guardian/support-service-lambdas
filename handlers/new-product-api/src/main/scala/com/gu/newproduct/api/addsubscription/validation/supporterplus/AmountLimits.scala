package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.AnnualSupporterPlus

case class SupporterPlusLimits(monthly: AmountLimits, annual: AmountLimits)

case class AmountLimits(min: Int, max: Int)

object AmountLimits {

  val gbp = SupporterPlusLimits(
    monthly = AmountLimits(min = 1200, max = 16600),
    annual = AmountLimits(min = 11900, max = 200000)
  )

  val aud = SupporterPlusLimits(
    monthly = AmountLimits(min = 2200, max = 20000),
    annual = AmountLimits(min = 21500, max = 240000)
  )

  val usd = SupporterPlusLimits(
    monthly = AmountLimits(min = 2000, max = 80000),
    annual = AmountLimits(min = 11900, max = 1000000)
  )

  val nzd = SupporterPlusLimits(
    monthly = AmountLimits(min = 2400, max = 20000),
    annual = AmountLimits(min = 23500, max = 240000)
  )

  val cad = SupporterPlusLimits(
    monthly = AmountLimits(min = 2200, max = 16600),
    annual = AmountLimits(min = 21900, max = 200000)
  )

  val eur = SupporterPlusLimits(
    monthly = AmountLimits(min = 1500, max = 16600),
    annual = AmountLimits(min = 14900, max = 200000)
  )

  def limitsFor(planId: PlanId, currency: Currency): AmountLimits = {
    val supporterPluscontributionLimits = supporterPlusLimitsfor(currency)
    if (planId == AnnualSupporterPlus) supporterPluscontributionLimits.annual else supporterPluscontributionLimits.monthly
  }

  def supporterPlusLimitsfor(currency: Currency): SupporterPlusLimits = currency match {
    case GBP => gbp
    case AUD => aud
    case USD => usd
    case NZD => nzd
    case CAD => cad
    case EUR => eur
  }

}
