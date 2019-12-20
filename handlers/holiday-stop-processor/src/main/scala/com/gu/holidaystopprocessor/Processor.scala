package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesFetcher
import com.gu.holiday_stops.subscription._
import com.gu.holiday_stops.{Zuora, _}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, NewspaperVoucherBook, ZuoraProductType}
import com.softwaremill.sttp.{Id, SttpBackend}

import scala.util.Try


object Processor {
  def processAllProducts(
    config: Config,
    processDateOverride: Option[LocalDate],
    backend: SttpBackend[Id, Nothing],
    fetchFromS3: S3Location => Try[String]
  ): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(err) =>
        List(ProcessResult(Nil, Nil, Nil, Some(OverallFailure(err.reason))))

      case Right(zuoraAccessToken) => {
        val fulfilmentDatesFetcher = FulfilmentDatesFetcher(fetchFromS3, Stage())
        List(
          NewspaperHomeDelivery,
          NewspaperVoucherBook,
          GuardianWeekly,
        )
        .map { productType =>
          processProduct(
            config,
            Salesforce.holidayStopRequests(config.sfConfig),
            fulfilmentDatesFetcher,
            processDateOverride,
            productType,
            Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
            Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
            Salesforce.holidayStopUpdateResponse(config.sfConfig)
          )
        }
      }
    }

  def processProduct(
    config: Config,
    getHolidayStopRequestsFromSalesforce: (ZuoraProductType, List[LocalDate]) => SalesforceHolidayResponse[List[HolidayStopRequestsDetail]],
    fulfilmentDatesFetcher: FulfilmentDatesFetcher,
    processOverrideDate: Option[LocalDate],
    productType: ZuoraProductType,
    getSubscription: SubscriptionName => ZuoraHolidayResponse[Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => ZuoraHolidayResponse[Unit],
    writeHolidayStopsToSalesforce: List[ZuoraHolidayWriteResult] => SalesforceHolidayResponse[Unit],
  ): ProcessResult = {
    val holidayStops = for {
      datesToProcess <- getDatesToProcess(fulfilmentDatesFetcher, productType, processOverrideDate, LocalDate.now())
      holidayStopsFromSalesforce <- getHolidayStopRequestsFromSalesforce(productType, datesToProcess)
    } yield holidayStopsFromSalesforce

    holidayStops match {
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

  def getDatesToProcess(
    fulfilmentDatesFetcher: FulfilmentDatesFetcher,
    zuoraProductType: ZuoraProductType,
    processOverRideDate: Option[LocalDate],
    today: LocalDate
  ): Either[ZuoraHolidayError, List[LocalDate]] = {
    processOverRideDate
      .fold(
        fulfilmentDatesFetcher
          .getFulfilmentDates(zuoraProductType, today)
          .map( fulfilmentDates =>
            fulfilmentDates.values.flatMap(_.holidayStopProcessorTargetDate).toList
          )
          .leftMap(error => ZuoraHolidayError(s"Failed to fetch fulfilment dates: $error"))
      )(
        processOverRideDate => List(processOverRideDate).asRight
      )
  }
}

