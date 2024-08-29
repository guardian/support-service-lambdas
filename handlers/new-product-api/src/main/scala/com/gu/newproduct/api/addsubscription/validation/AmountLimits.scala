package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.AnnualContribution

case class ContributionLimits(monthly: AmountLimits, annual: AmountLimits)

case class AmountLimits(min: Int, max: Int)

object AmountLimits {

  def limitsFromMajorToMinorUnits(min: Int, max: Int) = AmountLimits(min * 100, max * 100)
  def fromMinorToMajor(value: Int) = value / 100

  val gbp = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 2, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  val aud = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 200),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  val usd = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 2, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  val nzd = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 200),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  val cad = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 5, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  val eur = ContributionLimits(
    monthly = AmountLimits.limitsFromMajorToMinorUnits(min = 2, max = 166),
    annual = AmountLimits.limitsFromMajorToMinorUnits(min = 10, max = 2000),
  )

  def limitsFor(planId: PlanId, currency: Currency): AmountLimits = {
    val contributionLimits = contributionLimitsfor(currency)
    if (planId == AnnualContribution) contributionLimits.annual else contributionLimits.monthly
  }

  def contributionLimitsfor(currency: Currency): ContributionLimits = currency match {
    case GBP => gbp
    case AUD => aud
    case USD => usd
    case NZD => nzd
    case CAD => cad
    case EUR => eur
  }
}
