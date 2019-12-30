package com.gu.holidaystopprocessor

import com.gu.holiday_stops.subscription.{ExtendedTerm, HolidayCreditUpdate, HolidayStopCredit, Subscription, SubscriptionData}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.softwaremill.sttp.{Id, SttpBackend}
import java.time.LocalDate
import com.gu.holiday_stops.ProductVariant._
import cats.implicits._
import com.gu.holiday_stops._


object Processor {
  def processAllProducts(config: Config, processDateOverride: Option[LocalDate], backend: SttpBackend[Id, Nothing]): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(err) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(err.reason))))

      case Right(zuoraAccessToken) =>
        List(
          GuardianWeekly,
          SaturdayVoucher,
          SundayVoucher,
          WeekendVoucher,
          SixdayVoucher,
          EverydayVoucher,
          EverydayPlusVoucher,
          SixdayPlusVoucher,
          WeekendPlusVoucher,
          SundayPlusVoucher,
          SaturdayPlusVoucher,
        )
          .map(productVariant => processProduct(config, Salesforce.holidayStopRequests(config.sfConfig)(productVariant, processDateOverride), _, _, _))
          .map{
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
      subscriptionData <- SubscriptionData(subscription)
      issueData <- subscriptionData.issueDataForDate(stop.stoppedPublicationDate)
      _ <- if (subscription.status == "Cancelled") Left(ZuoraHolidayError(s"Cannot process cancelled subscription because Zuora does not allow amending cancelled subs (Code: 58730020). Apply manual refund ASAP! $stop; ${subscription.subscriptionNumber};")) else Right(())
      maybeExtendedTerm = ExtendedTerm(issueData.nextBillingPeriodStartDate, subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(
        config.holidayCreditProduct,
        subscription,
        stop.stoppedPublicationDate,
        maybeExtendedTerm,
        HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
      )
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

