package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator.SundayVoucherIssueSuspensionConstants
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, ProductName, ProductRatePlanKey, ProductRatePlanName, ProductType, StoppedPublicationDate, SubscriptionName}
import cats.implicits._

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
        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(
          config.holidayCreditProduct,
          config.productRatePlanChargeId,
          getSubscription,
          updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
        ))
        val (failedZuoraResponses, successfulZuoraResponses) = allZuoraHolidayStopResponses.separate
        val notAlreadyActionedHolidays = successfulZuoraResponses.filterNot(v => alreadyActionedHolidayStops.contains(v.chargeCode))
        val salesforceExportResult = writeHolidayStopsToSalesforce(notAlreadyActionedHolidays)
        ProcessResult(
          holidayStops,
          allZuoraHolidayStopResponses,
          notAlreadyActionedHolidays,
          OverallFailure(failedZuoraResponses, salesforceExportResult)
        )
    }
  }
  private def calculateProcessDate(processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays(SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays))
  }

  private def writeHolidayStopToZuora(
    holidayCreditProduct: HolidayCreditProduct,
    sundayVoucherProductRatePlanChargeId: String,
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
  )(stop: HolidayStop): Either[ZuoraHolidayWriteError, HolidayStopResponse] = {
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription"))
      currentSundayVoucherSubscription <- CurrentSundayVoucherSubscription(subscription, sundayVoucherProductRatePlanChargeId)
      nextInvoiceStartDate = SundayVoucherNextBillingPeriodStartDate(currentSundayVoucherSubscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit <- CreditCalculator.sundayVoucherCredit(sundayVoucherProductRatePlanChargeId, stop.stoppedPublicationDate)(subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, holidayCreditUpdate)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(ZuoraHolidayWriteError(s"Failed to write holiday stop to Zuora: $stop"))
    } yield {
      println("woohoo")
      println(holidayCreditUpdate)
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
