package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._

object HolidayStopProcess {

  def apply(config: Config): ProcessResult =
    Zuora.accessTokenGetResponse(config.zuoraConfig) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(zuoraAccessToken) =>
        processHolidayStops(
          config.holidayCreditProduct,
          getHolidayStopRequestsFromSalesforce = Salesforce.holidayStopRequests(config.sfConfig),
          getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken),
          updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken),
          writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig)
        )
    }

  def processHolidayStops(
    holidayCreditProduct: HolidayCreditProduct,
    getHolidayStopRequestsFromSalesforce: ProductName => Either[OverallFailure, Seq[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[HolidayStopFailure, Unit],
    writeHolidayStopsToSalesforce: Seq[HolidayStopResponse] => Either[OverallFailure, Unit]
  ): ProcessResult = {
    getHolidayStopRequestsFromSalesforce(ProductName("Guardian Weekly")) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(holidayCreditProduct, getSubscription, updateSubscription))
        val successfulZuoraResponses = allZuoraHolidayStopResponses collect { case Right(v) => v } // FIXME: What happens with failures?
        val notAlreadyActionedHolidays = successfulZuoraResponses.filterNot(v => alreadyActionedHolidayStops.contains(v.chargeCode))
        val salesforceExportResult = writeHolidayStopsToSalesforce(notAlreadyActionedHolidays).left.toOption
        ProcessResult(holidayStops, allZuoraHolidayStopResponses, notAlreadyActionedHolidays, salesforceExportResult)
    }
  }

  /**
   * This is the main business logic for writing holiday stop to Zuora
   */
  def writeHolidayStopToZuora(
    holidayCreditProduct: HolidayCreditProduct,
    getSubscription: SubscriptionName => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[HolidayStopFailure, Unit]
  )(stop: HolidayStop): Either[HolidayStopFailure, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(HolidayStopFailure("Cannot currently process non-auto-renewing subscription"))
      nextInvoiceStartDate <- NextBillingPeriodStartDate(subscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit = HolidayCredit(subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, holidayCreditUpdate)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(HolidayStopFailure("Failed to add charge to subscription"))
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
