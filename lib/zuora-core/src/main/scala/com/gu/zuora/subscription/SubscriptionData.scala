package com.gu.zuora.subscription

import java.time.{DayOfWeek, LocalDate}
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import cats.syntax.all._
import RatePlanChargeData.round2Places

import math.abs
import scala.util.chaining.scalaUtilChainingOps

// FIXME: We need to make sure credit calculation goes through a single code path. Right now onus is on the user to make sure discounts are applied to credit.
case class IssueData(issueDate: LocalDate, billDates: BillDates, credit: Double) {
  /**
   * This returns the date for the next bill after the stoppedPublicationDate.
   *
   * This currently calculates the current billing period and uses the following day. This is an over simplification
   * but works for current use cases
   *
   * For more details about the calculation of the current billing period see:
   *
   * [[com.gu.zuora.subscription.RatePlanChargeBillingSchedule]]
   *
   * @return Date of the first day of the next billing period
   *         following this <code>stoppedPublicationDate</code>.
   */
  def nextBillingPeriodStartDate: LocalDate = {
    billDates.endDate.plusDays(1)
  }
}

trait SubscriptionData {
  @deprecated("Migrate to https://github.com/guardian/invoicing-api/pull/20") def issueDataForDate(issueDate: LocalDate): Either[ZuoraApiFailure, IssueData]
  def issueDataForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData]
  def productType: ZuoraProductType
  def subscriptionAnnualIssueLimit: Int
  def editionDaysOfWeek: List[DayOfWeek]
}
object SubscriptionData {
  def apply(subscription: Subscription, account: ZuoraAccount): Either[ZuoraApiFailure, SubscriptionData] = {
    val supportedRatePlanCharges: List[(RatePlanCharge, SupportedRatePlanCharge, SupportedProduct)] = for {
      ratePlan <- subscription.ratePlans if ratePlan.lastChangeType =!= Some("Remove")
      supportedProduct <- getSupportedProductForRatePlan(ratePlan).toList
      supportedRatePlan <- getSupportedRatePlanForRatePlan(ratePlan, supportedProduct).toList
      unExpiredRatePlanCharge <- getUnexpiredRatePlanCharges(ratePlan)
      supportedRatePlanCharge <- getSupportedRatePlanCharge(supportedRatePlan, unExpiredRatePlanCharge)
    } yield (unExpiredRatePlanCharge, supportedRatePlanCharge, supportedProduct)

    for {
      ratePlanChargeDatas <- supportedRatePlanCharges
        .traverse[ZuoraApiResponse, RatePlanChargeData] {
          case (ratePlanCharge, supportedRatePlanCharge, _) =>
            RatePlanChargeData(
              subscription,
              ratePlanCharge,
              account,
              supportedRatePlanCharge.dayOfWeek,
            )
        }
      nonZeroRatePlanChargeDatas = ratePlanChargeDatas.filter { ratePlanChargeData =>
        ratePlanChargeData.issueCreditAmount != 0
      }
      productType <- getZuoraProductType(supportedRatePlanCharges.map(_._3))
      annualIssueLimitPerEdition <- getAnnualIssueLimitPerEdition(supportedRatePlanCharges.map(_._3))
    } yield createSubscriptionData(nonZeroRatePlanChargeDatas, productType, annualIssueLimitPerEdition, subscription)
  }

  private def createSubscriptionData(
    nonZeroRatePlanChargeDatas: List[RatePlanChargeData],
    zuoraProductType: ZuoraProductType,
    productAnnualIssueLimitPerEdition: Int,
    subscription: Subscription,
  ): SubscriptionData = {
    new SubscriptionData {
      def issueDataForDate(issueDate: LocalDate): Either[ZuoraApiFailure, IssueData] = {
        for {
          ratePlanChargeData <- ratePlanChargeDataForDate(nonZeroRatePlanChargeDatas, issueDate)
          billingPeriod <- ratePlanChargeData.billingSchedule.billDatesCoveringDate(issueDate)
        } yield {
          applyAnyDiscounts(IssueData(issueDate, billingPeriod, ratePlanChargeData.issueCreditAmount))
        }
      }

      // Calculate credit by taking into account potential discounts, otherwise return original credit
      def applyAnyDiscounts(issueData: IssueData): IssueData = {
        import issueData._

        def isActiveDiscount(start: LocalDate, end: LocalDate): Boolean =
          (start.isEqual(issueDate) || start.isBefore(issueDate)) && end.isAfter(issueDate)

        val discounts: List[Double] =
          subscription
            .ratePlans
            .iterator
            .filter(_.productName == "Discounts")
            .flatMap(_.ratePlanCharges.map(rpc => (rpc.discountPercentage, rpc.effectiveStartDate, rpc.effectiveEndDate)))
            .collect { case (percent, start, end) if percent.isDefined && isActiveDiscount(start, end) => percent }
            .flatten
            .map(_ / 100)
            .toList

        def verify(discountedCredit: Double): Double = {
          discountedCredit
            .tap(v => assert(abs(v) <= abs(issueData.credit), "Discounted credit should not be more than un-discounted"))
            .tap(v => assert(v <= 0, "Credit should be negative"))
            .tap(v => assert(v.toString.dropWhile(_ != '.').tail.length <= 2, "Credit should have up to two decimal places"))
            // an arbitrarily high threshold - any discount higher than this is probably a mistaken calculation
            .tap(v => assert(abs(v) < 15.0, "Credit should not go beyond maximum bound"))
            .tap(v => if (discounts.isEmpty) assert(v == issueData.credit, "Credit should not be affected if there are no discounts"))
          }

        discounts
          .foldLeft(issueData.credit) { case (acc, next) => acc * (1 - next) }
          .pipe(round2Places)
          .pipe(verify)
          .pipe(discountedCredit => issueData.copy(credit = discountedCredit))
      }

      def issueDataForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData] = {
        nonZeroRatePlanChargeDatas
          .flatMap(_.getIssuesForPeriod(startDateInclusive, endDateInclusive))
          .map(applyAnyDiscounts)
          .sortBy(_.issueDate)(Ordering.fromLessThan(_.isBefore(_)))
      }

      override def productType: ZuoraProductType = {
        zuoraProductType
      }

      override def subscriptionAnnualIssueLimit: Int = {
        productAnnualIssueLimitPerEdition * editionDaysOfWeek.size
      }

      override def editionDaysOfWeek: List[DayOfWeek] =
        nonZeroRatePlanChargeDatas.map(_.issueDayOfWeek).distinct
    }
  }

  private def getSupportedRatePlanCharge(supportedRatePlan: SupportedRatePlan, unExpiredRatePlanCharge: RatePlanCharge) = {
    supportedRatePlan.ratePlanCharges.find(_.name == unExpiredRatePlanCharge.name)
  }

  private def getSupportedRatePlanForRatePlan(ratePlan: RatePlan, supportedProduct: SupportedProduct) = {
    supportedProduct.ratePlans.find(_.name == ratePlan.ratePlanName)
  }

  private def getSupportedProductForRatePlan(ratePlan: RatePlan) = {
    SupportedProduct.supportedProducts.find(_.name == ratePlan.productName)
  }

  private def getUnexpiredRatePlanCharges(ratePlan: RatePlan) = {
    ratePlan.ratePlanCharges.filter(_.chargedThroughDate.forall(!_.isBefore(MutableCalendar.today)))
  }

  def ratePlanChargeDataForDate(ratePlanChargeData: List[RatePlanChargeData], date: LocalDate): Either[ZuoraApiFailure, RatePlanChargeData] = {
    ratePlanChargeData
      .find { ratePlanCharge =>
        ratePlanCharge.billingSchedule.isDateCoveredBySchedule(date) &&
          ratePlanCharge.issueDayOfWeek == date.getDayOfWeek
      }
      .toRight(
        ZuoraApiFailure(s"Subscription does not have a rate plan for date $date")
      )
  }

  private def getZuoraProductType(supportedProducts: List[SupportedProduct]): Either[ZuoraApiFailure, ZuoraProductType] = {
    supportedProducts
      .map(_.productType)
      .distinct match {
        case Nil => ZuoraApiFailure("Could not derive product type as there are no supported rateplan charges").asLeft
        case List(productType) => productType.asRight
        case moreThanOne => ZuoraApiFailure(
          s"Could not derive product type as they are rate plan charges from more than one product type $moreThanOne"
        ).asLeft
      }
  }

  private def getAnnualIssueLimitPerEdition(supportedProducts: List[SupportedProduct]): Either[ZuoraApiFailure, Int] = {
    supportedProducts
      .map(_.annualIssueLimitPerEdition)
      .distinct match {
        case Nil => ZuoraApiFailure("Could not derive annual issue limit as there are no supported rateplan charges").asLeft
        case List(productType) => productType.asRight
        case moreThanOne => ZuoraApiFailure(
          s"Could not annual issue limit as they are rate plan charges from more than one annual issue limit $moreThanOne"
        ).asLeft
      }
  }
}
