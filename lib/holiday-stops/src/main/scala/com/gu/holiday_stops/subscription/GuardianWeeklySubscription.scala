package com.gu.holiday_stops.subscription

import java.time.LocalDate
import java.time.LocalDate.now

import com.gu.holiday_stops.ZuoraHolidayError
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.typesafe.scalalogging.LazyLogging
import GuardianWeeklyRatePlanCondition._
import acyclic.skipped

import scala.util.Try
import StoppedProduct._
import mouse.all._

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
      ratePlan.ratePlanCharges.exists(_.chargedThroughDate.exists(_.isBefore(now)))

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
  override val invoicedPeriod: CurrentInvoicedPeriod,
  override val stoppedPublicationDate: LocalDate
) extends StoppedProduct(subscriptionNumber, stoppedPublicationDate, price, billingPeriod, invoicedPeriod)

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
object GuardianWeeklySubscription {
  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): Either[ZuoraHolidayError, GuardianWeeklySubscription] = {

    // stoppedPublicationDate within N-for-N period
    lazy val maybeWithinNforN =
      for {
        nForN <- subscription.ratePlans.find(ratePlan =>
          productIsUnexpiredGuardianWeekly(ratePlan) &&
            productIsSixForSix(ratePlan) &&
            stoppedPublicationDateFallsStrictlyWithinInvoicedPeriod(ratePlan, stoppedPublicationDate))
        nForNRatePlanCharge <- nForN.ratePlanCharges.headOption
        billingPeriod <- nForNRatePlanCharge.billingPeriod
        startDateIncluding <- nForNRatePlanCharge.processedThroughDate
        endDateExcluding <- nForNRatePlanCharge.chargedThroughDate
      } yield {
        new GuardianWeeklySubscription(
          subscription.subscriptionNumber,
          billingPeriod,
          nForNRatePlanCharge.price,
          CurrentInvoicedPeriod(startDateIncluding, endDateExcluding),
          stoppedPublicationDate.value
        )
      }

    // just a regular Guardian Weekly
    lazy val maybeRegularGw =
      for {
        currentGuardianWeeklyRatePlan <- subscription.ratePlans.find(rp =>
          productIsUnexpiredGuardianWeekly(rp) &&
            !productIsSixForSix(rp) &&
            stoppedPublicationDateIsAfterCurrentInvoiceStartDate(rp, stoppedPublicationDate))
        currentGuardianWeeklyRatePlanCharge <- currentGuardianWeeklyRatePlan.ratePlanCharges.headOption
        billingPeriod <- currentGuardianWeeklyRatePlanCharge.billingPeriod
        startDateIncluding <- currentGuardianWeeklyRatePlanCharge.processedThroughDate
        endDateExcluding <- currentGuardianWeeklyRatePlanCharge.chargedThroughDate
      } yield {
        new GuardianWeeklySubscription(
          subscription.subscriptionNumber,
          billingPeriod,
          currentGuardianWeeklyRatePlanCharge.price,
          CurrentInvoicedPeriod(startDateIncluding, endDateExcluding),
          stoppedPublicationDate.value
        )
      }

    // regular GW + N-for-N and stoppedPublicationDate falls within regular GW invoiced period
    lazy val maybeGwWithIntro =
      for {
        nForN <- subscription.ratePlans.find(ratePlan =>
          productIsUnexpiredGuardianWeekly(ratePlan) &&
            ratePlan.ratePlanCharges.exists(_.billingPeriod.contains("Specific_Weeks")))
        regular <- subscription.ratePlans.find(ratePlan =>
          productIsUnexpiredGuardianWeekly(ratePlan) &&
            !ratePlan.ratePlanCharges.exists(_.billingPeriod.contains("Specific_Weeks")))
        predictedInvoicedPeriod <- PredictedInvoicedPeriod(regular, nForN)
        regularRpc <- regular.ratePlanCharges.headOption
        _ <- (stoppedPublicationDate.value.isEqual(predictedInvoicedPeriod.startDateIncluding) || stoppedPublicationDate.value.isAfter(predictedInvoicedPeriod.startDateIncluding)) option {}
      } yield {
        GuardianWeeklySubscription(
          subscriptionNumber = subscription.subscriptionNumber,
          billingPeriod = regularRpc.billingPeriod.get,
          price = regularRpc.price,
          invoicedPeriod = predictedInvoicedPeriod,
          stoppedPublicationDate.value
        )
      }

    (maybeWithinNforN orElse maybeRegularGw orElse maybeGwWithIntro)
      .toRight(ZuoraHolidayError(s"Failed to determine current Guardian Weekly or Guardian Weekly+N-for-N rate plan: $subscription"))

  }
}

