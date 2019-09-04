package com.gu.holiday_stops

import java.time.LocalDate

import scala.util.Try

/**
 * Conditions defining what Guardian Weekly subscription the customer has today.
 */
sealed trait CurrentGuardianWeeklyRatePlanCondition
case object RatePlanIsGuardianWeekly extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlan: RatePlan, guardianWeeklyProductRatePlanIds: List[String]): Boolean =
    guardianWeeklyProductRatePlanIds.contains(ratePlan.productRatePlanId)
}
case object RatePlanHasBeenInvoiced extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlan: RatePlan): Boolean = {
    Try {
      val fromInclusive = ratePlan.ratePlanCharges.head.processedThroughDate.get
      val toExclusive = ratePlan.ratePlanCharges.head.chargedThroughDate.get
      toExclusive.isAfter(fromInclusive)
    }.getOrElse(false)
  }
}
case object RatePlanHasExactlyOneCharge extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlan: RatePlan): Boolean = (ratePlan.ratePlanCharges.size == 1)
}
case object ChargeIsQuarterlyOrAnnual extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlan: RatePlan): Boolean =
    Try {
      List("Annual", "Quarter").contains(ratePlan.ratePlanCharges.head.billingPeriod.get)
    }.getOrElse(false)
}
//case object TodayHasBeenInvoiced extends CurrentGuardianWeeklyRatePlanCondition { // FIXME: This is a stronger check than RatePlanHasBeenInvoiced but requires significant refactoring of tests
//  def apply(ratePlan: RatePlan): Boolean =
//    Try {
//      PeriodContainsDate(
//        startPeriodInclusive = ratePlan.ratePlanCharges.head.processedThroughDate.get,
//        endPeriodExcluding = ratePlan.ratePlanCharges.head.chargedThroughDate.get,
//        date = LocalDate.now()
//      )
//    }.getOrElse(false)
//}

case object RatePlanHasNotBeenInvoiced extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlan: RatePlan): Boolean = {
    Try {
      val fromIsNull = ratePlan.ratePlanCharges.head.processedThroughDate.isEmpty
      val toIsNull = ratePlan.ratePlanCharges.head.chargedThroughDate.isEmpty
      fromIsNull && toIsNull
    }.getOrElse(false)
  }
}

case object RatePlanHasNForNGuardianWeeklyIntroPlan extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlans: List[RatePlan], guardianWeeklyNForNProductRatePlanIds: List[String]): Boolean =
    ratePlans.exists(ratePlan => guardianWeeklyNForNProductRatePlanIds.contains(ratePlan.productRatePlanId))
}

case object GuradianWeeklyNForNHasBeenInvoiced extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlans: List[RatePlan], guardianWeeklyNForNProductRatePlanIds: List[String]): Boolean = {
    ratePlans
      .find(ratePlan => guardianWeeklyNForNProductRatePlanIds.contains(ratePlan.productRatePlanId))
      .map { gwNForN =>
        Try {
          val fromInclusive = gwNForN.ratePlanCharges.head.processedThroughDate.get
          val toExclusive = gwNForN.ratePlanCharges.head.chargedThroughDate.get
          toExclusive.isAfter(fromInclusive)
        }.getOrElse(false)
      }.getOrElse(false)
  }
}

object GuardianWeeklyNForNRatePlan extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlans: List[RatePlan], guardianWeeklyNForNProductRatePlanIds: List[String]): RatePlan =
    ratePlans
      .find(ratePlan => guardianWeeklyNForNProductRatePlanIds.contains(ratePlan.productRatePlanId))
      .getOrElse(throw new Error("Failed to find Guardian Weekly N for N intro plan"))
}

/**
 * Model representing 'What Guardian Weekly does the customer have today?'
 *
 * The idea is to have a single unified object as an answer to this question because Zuora's answer is
 * scattered across multiple objects such as Subscription, RatePlan, RatePlanCharge.
 */
case class CurrentGuardianWeeklySubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String
)

/**
 * Is date between two dates where including the start while excluding the end?
 */
object PeriodContainsDate extends ((LocalDate, LocalDate, LocalDate) => Boolean) {
  def apply(
    startPeriodInclusive: LocalDate,
    endPeriodExcluding: LocalDate,
    date: LocalDate
  ): Boolean =
    (date.isEqual(startPeriodInclusive) || date.isAfter(startPeriodInclusive)) && date.isBefore(endPeriodExcluding)
}

/**
 * Invoiced period defined by [startDateIncluding, endDateExcluding) specifies the current period for which
 * the customer has been billed. Today must be within this period.
 *
 * @param startDateIncluding service active on startDateIncluding; corresponds to processedThroughDate
 * @param endDateExcluding service ends on endDateExcluding; corresponds to chargedThroughDate
 */
case class CurrentInvoicedPeriod(
  startDateIncluding: LocalDate,
  endDateExcluding: LocalDate
) {
  private val todayIsWithinCurrentInvoicedPeriod: Boolean = PeriodContainsDate(
    startPeriodInclusive = startDateIncluding,
    endPeriodExcluding = endDateExcluding,
    date = LocalDate.now()
  )
  // FIXME: Enable this after test refactoring
  //  require(todayIsWithinCurrentInvoicedPeriod, "Today should be within [startDateIncluding, endDateExcluding)")
}

object PredictedGwWithNForNInvoicedPeriod {
  def apply(guardianWeeklyWithoutInvoice: RatePlan, gwNForN: RatePlan): CurrentInvoicedPeriod = {
    val billingPeriod = guardianWeeklyWithoutInvoice.ratePlanCharges.head.billingPeriod.get
    val from = gwNForN.ratePlanCharges.head.chargedThroughDate.get
    val to = billingPeriod match {
      case "Quarter" => from.plusMonths(3)
      case "Annual" => from.plusYears(1)
      case _ => throw new RuntimeException(s"Failed to calculate predicted invoice period because of unknown billing period $billingPeriod. Fix ASAP!")
    }
    CurrentInvoicedPeriod(from, to)
  }
}

/**
 * What Guardian Weekly does the customer have today?
 *
 * Zuora subscription can have multiple rate plans so this function selects just the one representing
 * current Guardian Weekly subscription. Given a Zuora subscription return a single current rate plan
 * attached to Guardian Weekly product that satisfies all of the CurrentGuardianWeeklyRatePlanPredicates.
 */
object CurrentGuardianWeeklySubscription {

  def apply(subscription: Subscription, guardianWeeklyProductRatePlanIds: List[String]): Either[ZuoraHolidayWriteError, CurrentGuardianWeeklySubscription] = {
    val maybeRegularGw =
      subscription
        .ratePlans
        .find { ratePlan =>
          List(
            RatePlanIsGuardianWeekly(ratePlan, guardianWeeklyProductRatePlanIds),
            RatePlanHasExactlyOneCharge(ratePlan),
            RatePlanHasBeenInvoiced(ratePlan),
            ChargeIsQuarterlyOrAnnual(ratePlan)
          ).forall(_ == true)
        }
        .map { currentGuardianWeeklyRatePlan => // these ugly gets are safe due to above conditions
          val currentGuardianWeeklyRatePlanCharge = currentGuardianWeeklyRatePlan.ratePlanCharges.head
          new CurrentGuardianWeeklySubscription(
            subscriptionNumber = subscription.subscriptionNumber,
            billingPeriod = currentGuardianWeeklyRatePlanCharge.billingPeriod.get,
            price = currentGuardianWeeklyRatePlanCharge.price,
            invoicedPeriod = CurrentInvoicedPeriod(
              startDateIncluding = currentGuardianWeeklyRatePlanCharge.processedThroughDate.get,
              endDateExcluding = currentGuardianWeeklyRatePlanCharge.chargedThroughDate.get
            ),
            ratePlanId = currentGuardianWeeklyRatePlan.id,
            productRatePlanId = currentGuardianWeeklyRatePlan.productRatePlanId
          )
        }

    def maybeGwWithIntro: Option[CurrentGuardianWeeklySubscription] = {
      subscription
        .ratePlans
        .find { ratePlan =>
          List(
            RatePlanIsGuardianWeekly(ratePlan, guardianWeeklyProductRatePlanIds),
            RatePlanHasExactlyOneCharge(ratePlan),
            RatePlanHasNotBeenInvoiced(ratePlan),
            RatePlanHasNForNGuardianWeeklyIntroPlan(subscription.ratePlans, /* FIXME */ guardianWeeklyProductRatePlanIds),
            GuradianWeeklyNForNHasBeenInvoiced(subscription.ratePlans, /* FIXME */ guardianWeeklyProductRatePlanIds),
            ChargeIsQuarterlyOrAnnual(ratePlan)
          ).forall(_ == true)
        }
        .map { currentGuardianWeeklyWithoutInvoice => // these ugly gets are safe due to above conditions

          val gwNForNwRatePlan = GuardianWeeklyNForNRatePlan(subscription.ratePlans, /* FIXME */ guardianWeeklyProductRatePlanIds)
          val currentGuardianWeeklyRatePlanCharge = currentGuardianWeeklyWithoutInvoice.ratePlanCharges.head
          new CurrentGuardianWeeklySubscription(
            subscriptionNumber = subscription.subscriptionNumber,
            billingPeriod = currentGuardianWeeklyRatePlanCharge.billingPeriod.get,
            price = currentGuardianWeeklyRatePlanCharge.price,
            invoicedPeriod = PredictedGwWithNForNInvoicedPeriod(currentGuardianWeeklyWithoutInvoice, gwNForNwRatePlan),
            ratePlanId = currentGuardianWeeklyWithoutInvoice.id,
            productRatePlanId = currentGuardianWeeklyWithoutInvoice.productRatePlanId
          )
        }
    }

    (maybeRegularGw orElse maybeGwWithIntro)
      .toRight(ZuoraHolidayWriteError(s"Subscription does not have a current Guardian Weekly rate plan: ${subscription}"))

  }
}
