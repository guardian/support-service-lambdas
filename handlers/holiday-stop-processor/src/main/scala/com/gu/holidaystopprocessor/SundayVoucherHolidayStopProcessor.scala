package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, ProductRatePlanKey, ProductRatePlanName, ProductType, StoppedPublicationDate, SubscriptionName}

object CommonHolidayStopProcessor {
  def processHolidayStops(
    product: ProductRatePlanKey,
    config: Config,
    getHolidayStopRequestsFromSalesforce: Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit],
  ): ProcessResult = {
    getHolidayStopRequestsFromSalesforce match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct

        val allZuoraHolidayStopResponses =
          product match {
            case ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday")) =>
              holidayStops.map(writeHolidayStopToZuoraSunday(config, getSubscription, updateSubscription))

            case ProductRatePlanKey(ProductType("Guardian Weekly"), _) =>
              holidayStops.map(writeHolidayStopToZuoraGuardianWeekly(config, getSubscription, updateSubscription))
          }

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
  private def writeHolidayStopToZuoraSunday(
    config: Config,
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
  )(stop: HolidayStop): Either[ZuoraHolidayWriteError, HolidayStopResponse] = {
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription"))
      currentSundayVoucherSubscription <- CurrentSundayVoucherSubscription(subscription, config)
      nextInvoiceStartDate = SundayVoucherNextBillingPeriodStartDate(currentSundayVoucherSubscription)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit <- CreditCalculator.calculateCredit(config)(stop.stoppedPublicationDate, subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(config.sundayVoucherConfig.holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
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

  def writeHolidayStopToZuoraGuardianWeekly(
    config: Config,
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit]
  )(stop: HolidayStop): Either[ZuoraHolidayWriteError, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(ZuoraHolidayWriteError("Cannot currently process non-auto-renewing subscription"))
      currentGuardianWeeklySubscription <- CurrentGuardianWeeklySubscription(subscription, config)
      nextInvoiceStartDate = NextBillingPeriodStartDate(currentGuardianWeeklySubscription, stop.stoppedPublicationDate)
      maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
      holidayCredit <- CreditCalculator.calculateCredit(config)(stop.stoppedPublicationDate, subscription)
      holidayCreditUpdate <- HolidayCreditUpdate(config.guardianWeeklyConfig.holidayCreditProduct, subscription, stop.stoppedPublicationDate, nextInvoiceStartDate, maybeExtendedTerm, holidayCredit)
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
