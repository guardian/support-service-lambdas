package com.gu.holidaystopbackfill

import java.io.File
import java.time.temporal.ChronoUnit
import java.time.{DayOfWeek, LocalDate}

import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, SubscriptionNameLookup}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._

import scala.io.Source
import scala.util.Try

case class ZuoraHolidayStop(subscriptionName: SubscriptionName, chargeNumber: HolidayStopRequestsDetailChargeCode, startDate: LocalDate, endDate: LocalDate, creditPrice: Double)

object ZuoraHolidayStop {

  def holidayStopsAlreadyInZuora(src: File): List[ZuoraHolidayStop] = {
    val source = Source.fromFile(src, "UTF-16")
    val stops = for {
      line <- source.getLines.drop(1).toList
      fields = line.split('\t')
      subscriptionName = fields(0)
      chargeNumber = fields(1)
      startDate <- Try(LocalDate.parse(fields(2))).toOption.toSeq
      endDate <- Try(LocalDate.parse(fields(3))).toOption.toSeq
      creditPrice = fields(4).toDouble
    } yield {
      ZuoraHolidayStop(
        SubscriptionName(subscriptionName),
        HolidayStopRequestsDetailChargeCode(chargeNumber),
        startDate,
        endDate,
        creditPrice
      )
    }
    source.close
    stops.distinct
  }
}

object SalesforceHolidayStop {

  def holidayStopRequestsAlreadyInSalesforce(sfCredentials: SFAuthConfig): Either[SalesforceFetchFailure, List[HolidayStopRequest]] = {
    Salesforce.holidayStopRequestsByProduct(sfCredentials)(ProductName("Guardian Weekly"))
  }

  def holidayStopRequestsToBeBackfilled(inZuora: List[ZuoraHolidayStop], inSalesforce: List[HolidayStopRequest]): List[NewHolidayStopRequest] = {

    def isSame(z: ZuoraHolidayStop, sf: HolidayStopRequest): Boolean =
      z.subscriptionName == sf.Subscription_Name__c &&
        z.startDate == sf.Start_Date__c.value &&
        z.endDate == sf.End_Date__c.value

    inZuora
      .filterNot { zuoraStop => inSalesforce.exists { sfStop => isSame(zuoraStop, sfStop) } }
      .map { zuoraStop =>
        NewHolidayStopRequest(
          HolidayStopRequestStartDate(zuoraStop.startDate),
          HolidayStopRequestEndDate(zuoraStop.endDate),
          SubscriptionNameLookup(zuoraStop.subscriptionName)
        )
      }
      .distinct
  }

  def applicableDates(
    fromInclusive: LocalDate,
    toInclusive: LocalDate,
    p: LocalDate => Boolean
  ): List[LocalDate] = {
    val dateRange = 0 to ChronoUnit.DAYS.between(fromInclusive, toInclusive).toInt
    dateRange.foldLeft(List.empty[LocalDate]) { (acc, i) =>
      val d = fromInclusive.plusDays(i)
      if (p(d)) acc :+ d
      else acc
    }
  }

  def detailsToBeBackfilled(inZuora: List[ZuoraHolidayStop], inSalesforce: List[HolidayStopRequest]): List[ActionedHolidayStopRequestsDetailToBackfill] = {

    /*
     * We take legacy holiday stops that have a range of dates
     * and we generate a new holiday stop for each stopped publication date
     * that falls into that date range.
     * Then we divide the credit price equally into each of the new holiday stops.
     */
    val stoppedPublications = inZuora.foldLeft(List.empty[ZuoraHolidayStop]) { (acc, stop) =>
      val stopDates = applicableDates(stop.startDate, stop.endDate, { _.getDayOfWeek == DayOfWeek.FRIDAY })
      val stops = stopDates map { date =>
        ZuoraHolidayStop(stop.subscriptionName, stop.chargeNumber, date, date, stop.creditPrice / stopDates.length)
      }
      acc ++ stops
    }

    /*
     * These are our criteria for determining if a legacy holiday stop in Zuora
     * is actually the same as an actioned detail recorded in Salesforce.
     */
    def isSame(z: ZuoraHolidayStop, sf: HolidayStopRequestsDetail): Boolean =
      z.subscriptionName == sf.Subscription_Name__c &&
        sf.Charge_Code__c.contains(z.chargeNumber) &&
        z.startDate == sf.Stopped_Publication_Date__c.value

    /*
     * This is used to find the corresponding request ID for the subscription in Salesforce.
     * There should be a request ID available for each subscription and stopped publication date
     * as in the first pass the parent holiday requests will have been populated.
     */
    def correspondingRequest(zStop: ZuoraHolidayStop): Option[HolidayStopRequest] = {
      inSalesforce find { sfStop =>
        val startDate = sfStop.Start_Date__c.value
        val endDate = sfStop.End_Date__c.value
        sfStop.Subscription_Name__c == zStop.subscriptionName &&
          (startDate.isBefore(zStop.startDate) || startDate.isEqual(zStop.startDate)) &&
          (endDate.isEqual(zStop.endDate) || endDate.isAfter(zStop.endDate))
      }
    }

    def alreadyBackfilled(zuoraStop: ZuoraHolidayStop): Boolean =
      inSalesforce.exists {
        _.Holiday_Stop_Request_Detail__r.exists {
          _.records.exists { sfDetail =>
            isSame(zuoraStop, sfDetail)
          }
        }
      }

    val details = for {
      zStop <- stoppedPublications.filterNot(alreadyBackfilled)
      sfRequest <- correspondingRequest(zStop)
    } yield {
      ActionedHolidayStopRequestsDetailToBackfill(
        sfRequest.Id,
        StoppedPublicationDate(zStop.startDate),
        Some(HolidayStopRequestsDetailChargePrice(zStop.creditPrice)),
        Some(zStop.chargeNumber),
        Some(HolidayStopRequestsDetailChargePrice(zStop.creditPrice))
      )
    }

    details.distinct
  }

  def holidayStopRequestsAddedToSalesforce(sfCredentials: SFAuthConfig, dryRun: Boolean)(requests: List[NewHolidayStopRequest]): Either[SalesforceUpdateFailure, Unit] =
    if (dryRun) {
      println("++++++++++++++++++++++++++++++")
      requests.foreach(println)
      println("++++++++++++++++++++++++++++++")
      Right(())
    } else Salesforce.holidayStopCreateResponse(sfCredentials)(requests)

  def detailsAddedToSalesforce(sfCredentials: SFAuthConfig, dryRun: Boolean)(details: List[ActionedHolidayStopRequestsDetailToBackfill]): Either[SalesforceUpdateFailure, Unit] =
    if (dryRun) {
      println("-----------------------------")
      details.foreach(println)
      println("-----------------------------")
      Right(())
    } else Salesforce.holidayStopDetailsCreateResponse(sfCredentials)(details)
}
