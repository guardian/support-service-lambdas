package com.gu.zuora.subscription

import java.time.{DayOfWeek, LocalDate}
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import cats.syntax.all._

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
    ratePlan.ratePlanCharges.filter(_.chargedThroughDate.map(!_.isBefore(MutableCalendar.today)).getOrElse(true))
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
