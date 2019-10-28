package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.implicits._
import acyclic.skipped
import com.gu.holiday_stops.ZuoraHolidayError
import com.gu.holiday_stops.subscription.GuardianWeeklyRatePlanCondition._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate

/**
 * Conditions defining what Guardian Weekly subscription the customer has today.
 */
object GuardianWeeklyRatePlanCondition {

  def productIsUnexpiredGuardianWeekly(ratePlan: RatePlan): Boolean = {

    lazy val isGuardianWeekly =
      List(
        "Guardian Weekly - Domestic",
        "Guardian Weekly - ROW",
        "Guardian Weekly Zone A",
        "Guardian Weekly Zone B",
        "Guardian Weekly Zone C"
      ).contains(ratePlan.productName)

    lazy val isExpired =
      ratePlan.ratePlanCharges.exists(_.chargedThroughDate.exists(_.isBefore(MutableCalendar.today)))

    isGuardianWeekly && !isExpired
  }

  def productIsSixForSix(ratePlan: RatePlan): Boolean =
    ratePlan.ratePlanCharges.exists(_.billingPeriod.contains("Specific_Weeks"))

}

/**
 * Model representing 'What Guardian Weekly does the customer have today?'
 *
 * The idea is to have a single unified object as an answer to this question because Zuora's answer is
 * scattered across multiple objects such as Subscription, RatePlan, RatePlanCharge.
 *
 */
case class GuardianWeeklySubscription(
  override val subscriptionNumber: String,
  override val billingPeriod: String,
  override val price: Double,
  override val stoppedPublicationDate: LocalDate,
  override val stoppedPublicationDateBillingPeriod: BillingPeriod
) extends StoppedProduct(subscriptionNumber, stoppedPublicationDate, price, billingPeriod, stoppedPublicationDateBillingPeriod)
/**
 * What Guardian Weekly does the customer have today?
 *
 * Zuora subscription can have multiple rate plans so this function selects just the one representing
 * current Guardian Weekly subscription. Given a Zuora subscription return a single current rate plan
 * attached to Guardian Weekly product that satisfies all of the CurrentGuardianWeeklyRatePlanPredicates.
 *
 * Note we also consider CurrentGuardianWeeklySubscription to be a subscription that has both regular
 * GW rate plan plus a N-for-N introductory rate plan (for example, GW Oct 18 - Six for Six - Domestic).
 * Purpose of N-for-N is providing customer with cheaper shorter plan to entice them to switch to regular one.
 */
object GuardianWeeklySubscription {
  type Result[A] = Either[ZuoraHolidayError, A]

  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): Result[GuardianWeeklySubscription] = {
    for {
      ratePlanChargeInfos <- getRatePlanChargeInfo(subscription)
      ratePlanChargeInfo <- findRatePlanChargeCoveringDate(stoppedPublicationDate, ratePlanChargeInfos)
      billingPeriodDate <- ratePlanChargeInfo.billingSchedule.billingPeriodForDate(stoppedPublicationDate.value)
    } yield GuardianWeeklySubscription(
      subscription.subscriptionNumber,
      ratePlanChargeInfo.zoraBillingPeriodId,
      ratePlanChargeInfo.ratePlan.price,
      stoppedPublicationDate.value,
      billingPeriodDate
    )
  }

  private def findRatePlanChargeCoveringDate(stoppedPublicationDate: StoppedPublicationDate, ratePlanChargeInfos: List[RatePlanChargeInfo]) = {
    ratePlanChargeInfos
      .find(ratePlanChargeInfo => ratePlanChargeInfo.billingSchedule.isDateCoveredBySchedule(stoppedPublicationDate.value))
      .toRight(ZuoraHolidayError(s"No rate plan charges could be found that covered the date $stoppedPublicationDate"))
  }

  private def getRatePlanChargeInfo(subscription: Subscription): Result[List[RatePlanChargeInfo]] = {
    subscription
      .ratePlans
      .filter(productIsUnexpiredGuardianWeekly)
      .flatMap(_.ratePlanCharges)
      .traverse[Result, RatePlanChargeInfo](RatePlanChargeInfo.apply)
  }
}

