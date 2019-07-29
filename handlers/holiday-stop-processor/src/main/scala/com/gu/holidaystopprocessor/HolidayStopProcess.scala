package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, ProductName, StoppedPublicationDate, SubscriptionName}

object HolidayStopProcess {

  def apply(config: Config): ProcessResult =
    Zuora.accessTokenGetResponse(config.zuoraConfig) map { zuoraAccessToken =>
      processHolidayStops(
        config,
        getRequests = Salesforce.holidayStopRequests(config.sfConfig),
        getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken),
        updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken),
        writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig)
      )
    } fold (ProcessResult.fromOverallFailure, identity)

  def processHolidayStops(
    config: Config,
    getRequests: ProductName => Either[OverallFailure, Seq[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[HolidayStopFailure, Unit],
    writeHolidayStopsToSalesforce: Seq[HolidayStopResponse] => Either[OverallFailure, Unit]
  ): ProcessResult = {
    (for {
      requests <- getRequests(ProductName("Guardian Weekly"))
      holidayStops <- Right(requests.distinct.map(HolidayStop(_)))
      alreadyExportedChargeCodes <- Right(requests.flatMap(_.Charge_Code__c).distinct)
    } yield {
      val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(config, getSubscription, updateSubscription))
      val successfulZuoraResponses = allZuoraHolidayStopResponses collect { case Right(success) if !alreadyExportedChargeCodes.contains(success.chargeCode) => success } // FIXME: We should make it clearer we are discarding failures.
      val salesforceExportResult = writeHolidayStopsToSalesforce(successfulZuoraResponses).left.toOption
      ProcessResult(holidayStops, allZuoraHolidayStopResponses, successfulZuoraResponses, salesforceExportResult)
    }).left.map(ProcessResult.fromOverallFailure).merge
  }

  /**
   * This is the main business logic for writing holiday stop to Zuora
   */
  def writeHolidayStopToZuora(
    config: Config,
    getSubscription: SubscriptionName => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[HolidayStopFailure, Unit]
  )(stop: HolidayStop): Either[HolidayStopFailure, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(HolidayStopFailure("Cannot currently process non-auto-renewing subscription"))
      nextInvoiceStartDate <- NextBillingPeriodStartDate(subscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit = HolidayCredit(subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(config, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
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
