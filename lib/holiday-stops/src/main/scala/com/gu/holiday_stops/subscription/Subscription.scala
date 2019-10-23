package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.HolidayStop

case class Subscription(
  subscriptionNumber: String,
  termStartDate: LocalDate,
  termEndDate: LocalDate,
  customerAcceptanceDate: LocalDate,
  currentTerm: Int,
  currentTermPeriodType: String,
  autoRenew: Boolean,
  ratePlans: List[RatePlan],
  status: String
) {

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

  lazy val allEffectiveStartDates: List[LocalDate] =
    ratePlans.flatMap(_.ratePlanCharges.map(_.effectiveStartDate))

  // this function accounts for the fact that in '6for6' the customerAcceptanceDate is the start date of the main rate plan
  // not the introductory rate plan - but should result in the date that the customer actually selected for their first issue
  lazy val fulfilmentStartDate: LocalDate =
    (customerAcceptanceDate :: allEffectiveStartDates).min[LocalDate](_ compareTo _)

  def hasHolidayStop(stop: HolidayStop): Boolean = ratePlanCharge(stop).isDefined
}

case class RatePlan(
  productName: String,
  ratePlanName: String,
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
  productRatePlanChargeId: String,
  specificBillingPeriod: Option[Int],
  endDateCondition: Option[String],
  upToPeriodsType: Option[String],
  upToPeriods: Option[Int]
)
