package com.gu.zuora.subscription

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import scala.annotation.tailrec
import scala.math.BigDecimal.RoundingMode
import com.typesafe.scalalogging.LazyLogging
import mouse.all._
import MutableCalendar.today
import cats.implicits._

case class Discount(percentage: Option[Double], from: LocalDate, until: LocalDate)

case class RatePlanChargeData(
  ratePlanCharge: RatePlanCharge,
  billingSchedule: RatePlanChargeBillingSchedule,
  billingPeriodName: String,
  issueDayOfWeek: DayOfWeek,
  issueCreditAmount: Double
) {
  def getIssuesForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData] = {
    @tailrec
    def getIssuesForPeriod(firstIssueDate: LocalDate, endDateInclusive: LocalDate, issueData: List[IssueData]): List[IssueData] = {
      if (firstIssueDate.isAfter(endDateInclusive)) {
        issueData
      } else {
        getIssuesForPeriod(
          firstIssueDate.`with`(TemporalAdjusters.next(issueDayOfWeek)),
          endDateInclusive,
          billingSchedule.billDatesCoveringDate(firstIssueDate) match {
            case Left(_) => issueData
            case Right(billingPeriod) => IssueData(firstIssueDate, billingPeriod, issueCreditAmount) :: issueData
          }
        )
      }
    }

    getIssuesForPeriod(
      startDateInclusive.`with`(TemporalAdjusters.nextOrSame(issueDayOfWeek)),
      endDateInclusive,
      Nil
    )
  }
}

object RatePlanChargeData extends LazyLogging {
  def apply(
    subscription: Subscription,
    ratePlanCharge: RatePlanCharge,
    account: ZuoraAccount,
    issueDayOfWeek: DayOfWeek,
  ): Either[ZuoraApiFailure, RatePlanChargeData] = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraApiFailure("RatePlanCharge.billingPeriod is required"))
      schedule <- RatePlanChargeBillingSchedule(subscription, ratePlanCharge, account)
      discount = maybeDiscount(subscription)
      issueCreditAmount <- calculateIssueCreditAmount(ratePlanCharge, discount)
    } yield RatePlanChargeData(ratePlanCharge, schedule, billingPeriodName, issueDayOfWeek, issueCreditAmount)
  }

  // Calculate credit
  private def calculateIssueCreditAmount(ratePlanCharge: RatePlanCharge, discountPercentageMaybe: Option[Double]) = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble

    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraApiFailure("RatePlanCharge.billingPeriod is required"))
      approximateBillingPeriodWeeks <- approximateBillingPeriodWeeksForName(billingPeriodName, ratePlanCharge.specificBillingPeriod)
      price = -roundUp(ratePlanCharge.price / approximateBillingPeriodWeeks)
    } yield discountPercentageMaybe.map(price * _).getOrElse(price)
  }

  private def approximateBillingPeriodWeeksForName(
    billingPeriodName: String,
    optionalSpecificBillingPeriod: Option[Int]
  ): Either[ZuoraApiFailure, Int] = {
    billingPeriodName match {
      case "Annual" => Right(52)
      case "Semi_Annual" => Right(26)
      case "Quarter" => Right(13)
      case "Month" => Right(4)
      case "Specific_Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
      case "Specific_Months" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(numberOfMonths => numberOfMonths * 4)
      case _ => Left(ZuoraApiFailure(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }

  def maybeDiscount(subscription: Subscription): Option[Double] = {
    subscription
      .ratePlans
      .iterator
      .filter(_.productName == "Discounts")
      .flatMap(_.ratePlanCharges.map(rpc => Discount(rpc.discountPercentage, rpc.effectiveStartDate, rpc.effectiveEndDate)))
      .filter(_.percentage.isDefined)
      .filter(_.until.isAfter(today))
      .flatMap(_.percentage).<|(discounts => if (discounts.size > 1) logger.warn(s"${subscription.subscriptionNumber} has multiple discounts"))
      .toList
      .maximumOption
  }
}
