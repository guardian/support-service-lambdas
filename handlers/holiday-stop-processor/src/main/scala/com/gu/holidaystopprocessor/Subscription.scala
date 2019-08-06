package com.gu.holidaystopprocessor

import java.time.LocalDate

case class Subscription(
  subscriptionNumber: String,
  termStartDate: LocalDate,
  termEndDate: LocalDate,
  currentTerm: Int,
  currentTermPeriodType: String,
  autoRenew: Boolean,
  ratePlans: List[RatePlan]
) {

  val originalRatePlanCharge: Option[RatePlanCharge] = {
    val chronologicallyOrderedRatePlans = ratePlans.sortBy { plan =>
      plan.ratePlanCharges.map(_.effectiveStartDate.toString).headOption.getOrElse("")
    }
    for {
      ratePlan <- chronologicallyOrderedRatePlans.headOption
      charge <- ratePlan.ratePlanCharges.headOption
    } yield charge
  }

  def ratePlanCharge(stop: HolidayStop): Option[RatePlanCharge] = {

    def isMatchingPlan(plan: RatePlan): Boolean = plan.productName == "Discounts"

    def isMatchingCharge(charge: RatePlanCharge): Boolean =
      charge.name == "Holiday Credit" &&
        charge.HolidayStart__c.exists { start =>
          start.isEqual(stop.stoppedPublicationDate) || start.isBefore(stop.stoppedPublicationDate)
        } &&
        charge.HolidayEnd__c.exists { end =>
          end.isEqual(stop.stoppedPublicationDate) || end.isAfter(stop.stoppedPublicationDate)
        }

    val charges = for {
      plan <- ratePlans if isMatchingPlan(plan)
      charge <- plan.ratePlanCharges.find(isMatchingCharge)
    } yield charge
    charges.headOption
  }

  def hasHolidayStop(stop: HolidayStop): Boolean = ratePlanCharge(stop).isDefined
}

case class RatePlan(
  productName: String,
  ratePlanCharges: List[RatePlanCharge],
  productRatePlanId: String,
  id: String
)

case class RatePlanCharge(
  name: String,
  number: String,
  price: Double,
  billingPeriod: Option[String],
  effectiveStartDate: LocalDate,
  chargedThroughDate: Option[LocalDate],
  HolidayStart__c: Option[LocalDate],
  HolidayEnd__c: Option[LocalDate],
  processedThroughDate: Option[LocalDate],
)


