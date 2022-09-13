package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.AnnualSupporterPlus

case class SupporterPlusLimits(monthly: AmountLimits, annual: AmountLimits)

case class AmountLimits(min: Int, max: Int)

object AmountLimits {

  def fromMajorUnits(min: Int, max: Int) = AmountLimits(min * 100, max * 100)

  val gbp = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 12, max = 166),
    annual = AmountLimits.fromMajorUnits(min = 119, max = 2000)
  )

  val aud = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 22, max = 200),
    annual = AmountLimits.fromMajorUnits(min = 215, max = 2400)
  )

  val usd = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 20, max = 800),
    annual = AmountLimits.fromMajorUnits(min = 119, max = 10000)
  )

  val nzd = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 24, max = 200),
    annual = AmountLimits.fromMajorUnits(min = 235, max = 2400)
  )

  val cad = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 22, max = 166),
    annual = AmountLimits.fromMajorUnits(min = 219, max = 2000)
  )

  val eur = SupporterPlusLimits(
    monthly = AmountLimits.fromMajorUnits(min = 15, max = 166),
    annual = AmountLimits.fromMajorUnits(min = 149, max = 2000)
  )

  def limitsFor(planId: PlanId, currency: Currency): AmountLimits = {
    val supporterPlusLimits = supporterPlusLimitsfor(currency)
    if (planId == AnnualSupporterPlus) supporterPlusLimits.annual else supporterPlusLimits.monthly
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
