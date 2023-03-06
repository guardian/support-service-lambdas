package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId.AnnualContribution

case class ContributionLimits(monthly: AmountLimits, annual: AmountLimits)

case class AmountLimits(min: Int, max: Int)

object AmountLimits {

  val gbp = ContributionLimits(
    monthly = AmountLimits(min = 200, max = 16600),
    annual = AmountLimits(min = 1000, max = 200000),
  )

  val aud = ContributionLimits(
    monthly = AmountLimits(min = 1000, max = 20000),
    annual = AmountLimits(min = 1000, max = 200000),
  )

  val usd = ContributionLimits(
    monthly = AmountLimits(min = 200, max = 16600),
    annual = AmountLimits(min = 1000, max = 200000),
  )

  val nzd = ContributionLimits(
    monthly = AmountLimits(min = 1000, max = 20000),
    annual = AmountLimits(min = 1000, max = 200000),
  )

  val cad = ContributionLimits(
    monthly = AmountLimits(min = 500, max = 16600),
    annual = AmountLimits(min = 1000, max = 200000),
  )

  val eur = ContributionLimits(
    monthly = AmountLimits(min = 200, max = 16600),
    annual = AmountLimits(min = 1000, max = 200000),
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
