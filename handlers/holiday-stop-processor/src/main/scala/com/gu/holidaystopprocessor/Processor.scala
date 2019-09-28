package com.gu.holidaystopprocessor

import com.gu.holiday_stops.subscription.{Credit, ExtendedTerm, HolidayCreditUpdate, NextBillingPeriodStartDate, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.softwaremill.sttp.{Id, SttpBackend}
import java.time.LocalDate
import cats.implicits._
import com.gu.holiday_stops._


object Processor {
  def processAllProducts(config: Config, processDateOverride: Option[LocalDate], backend: SttpBackend[Id, Nothing]): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(err) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(err.reason))))

      case Right(zuoraAccessToken) =>
        List(
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(GuardianWeekly, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(SundayVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(WeekendVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(SixdayVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(EverydayVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(EverydayPlusVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(SixdayPlusVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(WeekendPlusVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(SundayPlusVoucher, processDateOverride), _, _, _),
          processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(SaturdayPlusVoucher, processDateOverride), _, _, _),
        ) map {
            _.apply(
              Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
              Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
              Salesforce.holidayStopUpdateResponse(config.sfConfig)
            )
          }
    }

  def processProduct(
    config: Config,
    getHolidayStopRequestsFromSalesforce: SalesforceHolidayResponse[List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => ZuoraHolidayResponse[Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => ZuoraHolidayResponse[Unit],
    writeHolidayStopsToSalesforce: List[ZuoraHolidayWriteResult] => SalesforceHolidayResponse[Unit],
  ): ProcessResult = {
    getHolidayStopRequestsFromSalesforce match {
      case Left(sfReadError) =>
        ProcessResult(Nil, Nil, Nil, Some(OverallFailure(sfReadError.reason)))

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(config, getSubscription, updateSubscription))
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
    config: Config,
    getSubscription: SubscriptionName => ZuoraHolidayResponse[Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => ZuoraHolidayResponse[Unit]
  )(stop: HolidayStop): ZuoraHolidayResponse[ZuoraHolidayWriteResult] = {
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayError("Cannot currently process non-auto-renewing subscription"))
      nextInvoiceStartDate <- NextBillingPeriodStartDate(config, subscription, stop.stoppedPublicationDate)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit <- Credit(config)(stop.stoppedPublicationDate, subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(config.holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, holidayCreditUpdate)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(ZuoraHolidayError(s"Failed to write holiday stop to Zuora: $stop"))
    } yield {
      ZuoraHolidayWriteResult(
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

