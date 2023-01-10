package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{
  HolidayStopRequestsDetail,
  HolidayStopRequestsDetailId,
  ProductName,
}
import com.gu.zuora.subscription.{AffectedPublicationDate, Price, RatePlanCharge, RatePlanChargeCode, SubscriptionName}
import cats.syntax.all._
import com.gu.creditprocessor.ZuoraCreditAddResult

case class ZuoraHolidayCreditAddResult(
    requestId: HolidayStopRequestsDetailId,
    subscriptionName: SubscriptionName,
    productName: ProductName,
    chargeCode: RatePlanChargeCode,
    estimatedPrice: Option[Price],
    actualPrice: Price,
    pubDate: AffectedPublicationDate,
) extends ZuoraCreditAddResult {

  val amountCredited: Price = actualPrice

  override def logDiscrepancies(): Unit = {

    // FIXME: Temporary logging to confirm the problem of incorrect credits is fixed. Change to hard crash once we are happy it should be impossible scenario.
    def warnOnCreditDifference(): Unit = {
      (estimatedPrice, Some(actualPrice)).mapN { (estimated, actual) =>
        if (estimated.value != actual.value)
          logger.warn(
            s"""Difference between actual and estimated credit
               |in sub ${subscriptionName.value},
               |stop ${requestId.value}. Investigate ASAP!
               |estimated.value=${estimated.value}; actual.value=${actual.value}""".stripMargin,
          )
      // throw new RuntimeException(s"Difference between actual and estimated credit. Investigate ASAP! estimated.value=${estimated.value}; actual.value=${actual.value}")
      }
    }

    warnOnCreditDifference()
  }
}

object ZuoraHolidayCreditAddResult {

  def apply(
      request: HolidayStopRequestsDetail,
      addedCharge: RatePlanCharge,
  ): ZuoraHolidayCreditAddResult = ZuoraHolidayCreditAddResult(
    request.Id,
    request.Subscription_Name__c,
    request.Product_Name__c,
    RatePlanChargeCode(addedCharge.number),
    request.Estimated_Price__c,
    Price(addedCharge.price),
    AffectedPublicationDate(addedCharge.HolidayStart__c.getOrElse(LocalDate.MIN)),
  )
}
