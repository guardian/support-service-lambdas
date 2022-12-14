package com.gu.zuora.subscription

import java.time.LocalDate

case class Subscription(
    subscriptionNumber: String,
    termStartDate: LocalDate,
    termEndDate: LocalDate,
    customerAcceptanceDate: LocalDate,
    contractEffectiveDate: LocalDate,
    currentTerm: Int,
    currentTermPeriodType: String,
    autoRenew: Boolean,
    ratePlans: List[RatePlan],
    status: String,
    accountNumber: String,
) {

  def ratePlanCharge(request: CreditRequest): Option[RatePlanCharge] = {

    def isMatchingPlan(plan: RatePlan): Boolean = plan.productName == "Discounts"

    def isMatchingCharge(charge: RatePlanCharge): Boolean = {
      val publicationDate = request.publicationDate.value
      charge.name == request.productRatePlanChargeName &&
      charge.HolidayStart__c.exists { start =>
        start.isEqual(publicationDate) || start.isBefore(publicationDate)
      } &&
      charge.HolidayEnd__c.exists { end =>
        end.isEqual(publicationDate) || end.isAfter(publicationDate)
      }
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

  def hasCreditAmendment(request: CreditRequest): Boolean = ratePlanCharge(request).isDefined
}

case class RatePlan(
    productName: String,
    ratePlanName: String,
    ratePlanCharges: List[RatePlanCharge],
    productRatePlanId: String,
    id: String,
    lastChangeType: Option[String],
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
    upToPeriods: Option[Int],
    billingDay: Option[String],
    triggerEvent: Option[String],
    triggerDate: Option[LocalDate],
    discountPercentage: Option[Double],
    effectiveEndDate: LocalDate,
)
