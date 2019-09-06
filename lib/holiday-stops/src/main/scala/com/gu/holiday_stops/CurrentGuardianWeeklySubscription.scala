package com.gu.holiday_stops

import java.time.LocalDate

import com.typesafe.scalalogging.LazyLogging

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

/**
 * Conditions defining what Guardian Weekly + N-for-N intro subscription the customer has today.
 */
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

case object GuardianWeeklyNForNHasBeenInvoiced extends CurrentGuardianWeeklyRatePlanCondition {
  def apply(ratePlans: List[RatePlan], guardianWeeklyNForNProductRatePlanIds: List[String]): Boolean = {
    ratePlans
      .find(ratePlan => guardianWeeklyNForNProductRatePlanIds.contains(ratePlan.productRatePlanId))
      .flatMap { gwNForN =>
        for {
          rpc <- Try(gwNForN.ratePlanCharges.head).toOption
          fromInclusive <- rpc.processedThroughDate
          toExclusive <- rpc.chargedThroughDate
        } yield toExclusive isAfter fromInclusive
      }.getOrElse(false)
  }
}

/**
 * Model representing 'What Guardian Weekly does the customer have today?'
 *
 * The idea is to have a single unified object as an answer to this question because Zuora's answer is
 * scattered across multiple objects such as Subscription, RatePlan, RatePlanCharge.
 *
 */
case class CurrentGuardianWeeklySubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  introNforNMode: Option[IntroNForNMode] = None // Is this GW+N-for-N scenario?
)

/**
 * N-for-N part of the Guardian Weekly + N-for-N scenario
 */
case class IntroNForNMode(
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
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

/**
 * Only for GW + N-for-N scenario when regular GW plan has not been invoiced so chargedThroughDate is null.
 */
object PredictedInvoicedPeriod extends LazyLogging {
  def apply(guardianWeeklyWithoutInvoice: RatePlan, gwNForN: RatePlan): Option[CurrentInvoicedPeriod] =
    for {
      guardianWeeklyWithoutInvoiceRpc <- Try(guardianWeeklyWithoutInvoice.ratePlanCharges.head).toOption
      gwNForNRpc <- Try(gwNForN.ratePlanCharges.head).toOption
      billingPeriod <- guardianWeeklyWithoutInvoiceRpc.billingPeriod
      from <- gwNForNRpc.chargedThroughDate
      to <- predictedChargedThroughDate(billingPeriod, from)
    } yield {
      CurrentInvoicedPeriod(from, to)
    }

  private def predictedChargedThroughDate(billingPeriod: String, gwNForNChargedThroughDate: LocalDate): Option[LocalDate] =
    billingPeriod match {
      case "Quarter" => Some(gwNForNChargedThroughDate.plusMonths(3))
      case "Annual" => Some(gwNForNChargedThroughDate.plusYears(1))
      case _ =>
        logger.error(s"Failed to calculate predicted invoice period because of unknown billing period $billingPeriod. Fix ASAP!")
        None
    }

}



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
 * Regular GW plan in this case has not been invoiced so chargedThroughDate is null.
 */
object CurrentGuardianWeeklySubscription {

  // Regular Guardian Weekly rate plan (for example, GW Oct 18 - Quarterly - Domestic)
  private def findGuardianWeeklyRatePlan(subscription: Subscription, guardianWeeklyProductRatePlanIds: List[String]): Option[RatePlan] =
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

  // Regular GW plan where there also exists N-for-N (for example, GW Oct 18 - Six for Six - Domestic)
  private def findGuardianWeeklyWithNForNRatePlan(subscription: Subscription, guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String]): Option[RatePlan] =
    subscription
      .ratePlans
      .find { ratePlan =>
        List(
          RatePlanIsGuardianWeekly(ratePlan, guardianWeeklyProductRatePlanIds),
          RatePlanHasExactlyOneCharge(ratePlan),
          RatePlanHasNotBeenInvoiced(ratePlan),
          RatePlanHasNForNGuardianWeeklyIntroPlan(subscription.ratePlans, gwNforNProductRatePlanIds),
          GuardianWeeklyNForNHasBeenInvoiced(subscription.ratePlans, gwNforNProductRatePlanIds),
          ChargeIsQuarterlyOrAnnual(ratePlan)
        ).forall(_ == true)
      }

  private def gwNForNRatePlan(subscription: Subscription, guardianWeeklyNForNProductRatePlanIds: List[String]): Option[RatePlan] =
    subscription
      .ratePlans
      .find(ratePlan => guardianWeeklyNForNProductRatePlanIds.contains(ratePlan.productRatePlanId))

  def apply(
    subscription: Subscription,
    guardianWeeklyProductRatePlanIds: List[String],
    gwNforNProductRatePlanIds: List[String]
  ): Either[ZuoraHolidayWriteError, CurrentGuardianWeeklySubscription] = {

    val maybeRegularGw =
      findGuardianWeeklyRatePlan(subscription, guardianWeeklyProductRatePlanIds)
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

    lazy val maybeGwWithIntro = // do not remove lazy
      for {
        currentGuardianWeeklyWithoutInvoice <- findGuardianWeeklyWithNForNRatePlan(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
        gwNForNwRatePlan <- gwNForNRatePlan(subscription, gwNforNProductRatePlanIds)
        predictedInvoicePeriod <- PredictedInvoicedPeriod(currentGuardianWeeklyWithoutInvoice, gwNForNwRatePlan)
      } yield { // // these ugly gets are safe due to above conditions
        val currentGuardianWeeklyRatePlanCharge = currentGuardianWeeklyWithoutInvoice.ratePlanCharges.head
        new CurrentGuardianWeeklySubscription(
          subscriptionNumber = subscription.subscriptionNumber,
          billingPeriod = currentGuardianWeeklyRatePlanCharge.billingPeriod.get,
          price = currentGuardianWeeklyRatePlanCharge.price,
          invoicedPeriod = predictedInvoicePeriod,
          ratePlanId = currentGuardianWeeklyWithoutInvoice.id,
          productRatePlanId = currentGuardianWeeklyWithoutInvoice.productRatePlanId,
          introNforNMode = Some(IntroNForNMode(
            billingPeriod = gwNForNwRatePlan.ratePlanCharges.head.billingPeriod.get,
            price = gwNForNwRatePlan.ratePlanCharges.head.price,
            invoicedPeriod = CurrentInvoicedPeriod(
              startDateIncluding = gwNForNwRatePlan.ratePlanCharges.head.processedThroughDate.get,
              endDateExcluding = gwNForNwRatePlan.ratePlanCharges.head.chargedThroughDate.get
            ),
            ratePlanId = gwNForNwRatePlan.id,
            productRatePlanId = gwNForNwRatePlan.productRatePlanId
          ))
        )
      }

    (maybeRegularGw orElse maybeGwWithIntro)
      .toRight(ZuoraHolidayWriteError(s"Failed to determine current Guardian Weekly or Guardian Weekly+N-for-N rate plan: $subscription"))

  }
}
