package com.gu.creditprocessor

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.zuora.subscription.{AffectedPublicationDate, RatePlanCharge, RatePlanChargeCode, SubscriptionName}

/**
 * Result of adding a credit amendment to a Zuora subscription.
 *
 * TODO: could this be replaced by com.gu.holiday_stops.CreditRequest?
 */
sealed trait ZuoraCreditAddResult {

  def subscriptionName: SubscriptionName

  /**
   * Publication date that credit is in compensation for.
   */
  def pubDate: AffectedPublicationDate

  /**
   * Unique code that identifies the rate plan charge added to the sub.
   */
  def chargeCode: RatePlanChargeCode

  /**
   * Amount of credit.
   */
  def actualPrice: HolidayStopRequestsDetailChargePrice
}

case class ZuoraHolidayCreditAddResult(
  requestId: HolidayStopRequestsDetailId,
  subscriptionName: SubscriptionName,
  productName: ProductName,
  chargeCode: RatePlanChargeCode,
  estimatedPrice: Option[HolidayStopRequestsDetailChargePrice],
  actualPrice: HolidayStopRequestsDetailChargePrice,
  pubDate: AffectedPublicationDate
) extends ZuoraCreditAddResult

object ZuoraCreditAddResult {

  def forHolidayStop(
    request: HolidayStopRequestsDetail,
    addedCharge: RatePlanCharge
  ): ZuoraHolidayCreditAddResult = ZuoraHolidayCreditAddResult(
    request.Id,
    request.Subscription_Name__c,
    request.Product_Name__c,
    RatePlanChargeCode(addedCharge.number),
    request.Estimated_Price__c,
    HolidayStopRequestsDetailChargePrice(addedCharge.price),
    AffectedPublicationDate(addedCharge.HolidayStart__c.getOrElse(LocalDate.MIN))
  )
}
