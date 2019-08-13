package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._

object HolidayStopProcess {

  def apply(config: Config, processDateOverride: Option[LocalDate]): ProcessResult =
    Zuora.accessTokenGetResponse(config.zuoraConfig) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(zuoraAccessToken) =>
        processHolidayStops(
          config.holidayCreditProduct,
          guardianWeeklyProductRatePlanIds = config.guardianWeeklyProductRatePlanIds,
          getHolidayStopRequestsFromSalesforce = Salesforce.holidayStopRequests(config.sfConfig, processDateOverride),
          getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken),
          updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken),
          writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig)
        )
    }

  def processHolidayStops(
    holidayCreditProduct: HolidayCreditProduct,
    guardianWeeklyProductRatePlanIds: List[String],
    getHolidayStopRequestsFromSalesforce: ProductName => Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit]
  ): ProcessResult = {
    getHolidayStopRequestsFromSalesforce(ProductName("Guardian Weekly")) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(holidayCreditProduct, guardianWeeklyProductRatePlanIds, getSubscription, updateSubscription))
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

  /**
   * This is the main business logic for writing holiday stop to Zuora
   */
  def writeHolidayStopToZuora(
    holidayCreditProduct: HolidayCreditProduct,
    guardianWeeklyProductRatePlanIds: List[String],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
  )(stop: HolidayStop): Either[ZuoraHolidayWriteError, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription"))
      currentGuardianWeeklySubscription <- CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds)
      nextInvoiceStartDate = NextBillingPeriodStartDate(currentGuardianWeeklySubscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit <- CreditCalculator.guardianWeeklyCredit(guardianWeeklyProductRatePlanIds)(subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, holidayCreditUpdate)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(ZuoraHolidayWriteError("Failed to add charge to subscription"))
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
