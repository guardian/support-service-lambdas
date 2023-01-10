package com.gu.zuora.subscription

/** Conditions defining what Guardian Weekly subscription the customer has today.
  */
object GuardianWeeklyRatePlanCondition {

  def productIsUnexpiredGuardianWeekly(ratePlan: RatePlan): Boolean = {

    lazy val isGuardianWeekly =
      List(
        "Guardian Weekly - Domestic",
        "Guardian Weekly - ROW",
        "Guardian Weekly Zone A",
        "Guardian Weekly Zone B",
        "Guardian Weekly Zone C",
      ).contains(ratePlan.productName)

    lazy val isExpired =
      ratePlan.ratePlanCharges.exists(_.chargedThroughDate.exists(_.isBefore(MutableCalendar.today)))

    isGuardianWeekly && !isExpired
  }
}
