package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator.SundayVoucherIssueSuspensionConstants
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, ProductName, ProductRatePlanKey, ProductRatePlanName, ProductType, StoppedPublicationDate, SubscriptionName}

object SundayVoucherHolidayStopProcessor {

  def processHolidayStops(
    config: SundayVoucherHolidayStopConfig,
    getHolidayStopRequestsFromSalesforce: (ProductRatePlanKey, LocalDate) => Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit],
    processDateOverride: Option[LocalDate]
  ): ProcessResult = {
    getHolidayStopRequestsFromSalesforce(ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday")), calculateProcessDate(processDateOverride)) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
        //        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(
        //          config.holidayCreditProduct,
        //          getSubscription,
        //          updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
        //        ))
        ProcessResult(Nil, Nil, Nil, None)
    }
  }
  private def calculateProcessDate(processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays(SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays))
  }

  private def writeHolidayStopToZuora(
    holidayCreditProduct: HolidayCreditProduct,
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
  )(stop: HolidayStop): Either[ZuoraHolidayWriteError, HolidayStopResponse] = {
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription"))
      currentSundayVoucherSubscription <- CurrentSundayVoucherSubscription(subscription, SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId)
      nextInvoiceStartDate = SundayVoucherNextBellingPeriodStartDate(currentSundayVoucherSubscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit = -10.79 / 4 // FIXME: wire in CreditCalculator.sundayVoucher
      holidayCreditUpdate <- HolidayCreditUpdate(holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, holidayCreditUpdate)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(ZuoraHolidayWriteError(s"Failed to write holiday stop to Zuora: $stop"))
    } yield {
      HolidayStopResponse(
        stop.requestId,
        stop.subscriptionName,
        stop.productName,
        HolidayStopRequestsDetailChargeCode(addedCharge.number),
        stop.estimatedCharge,
        HolidayStopRequestsDetailChargePrice(addedCharge.price),
        StoppedPublicationDate(addedCharge.HolidayStart__c.getOrElse(LocalDate.MIN))
      )
    }
  }
}
