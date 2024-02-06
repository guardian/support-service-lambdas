package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.i18n.Currency
import com.gu.i18n.Currency.*
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.AnnualSupporterPlus

case class SupporterPlusLimits(monthly: AmountLimits, annual: AmountLimits)

case class AmountLimits(min: Int, max: Int)

object AmountLimits {

  def limitsFromMajorToMinorUnits(min: Int, max: Int) = AmountLimits(min * 100, max * 100)
  def fromMinorToMajor(value: Int) = value / 100

  val gbp = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 95, max = 2000),
  )

  val aud = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 17, max = 200),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 160, max = 2400),
  )

  val usd = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 13, max = 800),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 120, max = 10000),
  )

  val nzd = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 17, max = 200),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 160, max = 2400),
  )

  val cad = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 13, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 120, max = 2000),
  )

  val eur = SupporterPlusLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 95, max = 2000),
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
    case _ => ???
  }

}
