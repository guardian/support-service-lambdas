package com.gu.holidaystopbackfill

import java.io.File
import java.time.temporal.ChronoUnit
import java.time.{DayOfWeek, LocalDate}

import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, ProductName, SubscriptionName, SubscriptionNameLookup}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraChargeCode, HolidayStopRequestActionedZuoraChargePrice, HolidayStopRequestActionedZuoraRef, HolidayStopRequestDetails, StoppedPublicationDate}
import com.gu.util.Time

import scala.io.Source
import scala.util.Try

case class ZuoraHolidayStop(subscriptionName: String, chargeNumber: String, startDate: LocalDate, endDate: LocalDate, creditPrice: Double)

object ZuoraHolidayStop {

  def holidayStopsAlreadyInZuora(src: File): Seq[ZuoraHolidayStop] = {
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
        subscriptionName,
        chargeNumber,
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

  def holidayStopRequestsAlreadyInSalesforce(sfCredentials: SFAuthConfig)(
    start: LocalDate,
    end: Option[LocalDate]
  ): Either[SalesforceFetchFailure, Seq[HolidayStopRequest]] = {
    Salesforce.holidayStopRequestsByProductAndDateRange(sfCredentials)(ProductName("Guardian Weekly"), start, end.getOrElse(LocalDate.MAX))
  }

  def zuoraRefsAlreadyInSalesforce(sfCredentials: SFAuthConfig)(start: LocalDate, end: Option[LocalDate]): Either[SalesforceFetchFailure, Seq[HolidayStopRequestDetails]] = {
    Salesforce.holidayStopRequestDetails(sfCredentials)(ProductName("Guardian Weekly"), start, end.getOrElse(LocalDate.MAX))
  }

  def holidayStopRequestsToBeBackfilled(inZuora: Seq[ZuoraHolidayStop], inSalesforce: Seq[HolidayStopRequest]): Seq[NewHolidayStopRequest] = {

    def isSame(z: ZuoraHolidayStop, sf: HolidayStopRequest): Boolean =
      z.subscriptionName == sf.Subscription_Name__c.value &&
        z.startDate == Time.toJavaDate(sf.Start_Date__c.value) &&
        z.endDate == Time.toJavaDate(sf.End_Date__c.value)

    inZuora
      .filterNot { zuoraStop => inSalesforce.exists { sfStop => isSame(zuoraStop, sfStop) } }
      .map { zuoraStop =>
        NewHolidayStopRequest(
          HolidayStopRequestStartDate(Time.toJodaDate(zuoraStop.startDate)),
          HolidayStopRequestEndDate(Time.toJodaDate(zuoraStop.endDate)),
          SubscriptionNameLookup(SubscriptionName(zuoraStop.subscriptionName))
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

  def zuoraRefsToBeBackfilled(inZuora: Seq[ZuoraHolidayStop], inSalesforce: Seq[HolidayStopRequestDetails]): Seq[HolidayStopRequestActionedZuoraRef] = {

    /*
     * We take legacy holiday stops that have a range of dates
     * and we generate a new holiday stop for each stopped publication date
     * that falls into that date range.
     * Then we divide the credit price equally into each of the new holiday stops.
     */
    val stoppedPublications = inZuora.foldLeft(Seq.empty[ZuoraHolidayStop]) { (acc, stop) =>
      val stopDates = applicableDates(stop.startDate, stop.endDate, { _.getDayOfWeek == DayOfWeek.FRIDAY })
      val stops = stopDates map { date =>
        ZuoraHolidayStop(stop.subscriptionName, stop.chargeNumber, date, date, stop.creditPrice / stopDates.length)
      }
      acc ++ stops
    }

    /*
     * These are our criteria for determining if a legacy holiday stop in Zuora
     * is actually the same as a Zuora ref recorded in Salesforce.
     */
    def isSame(z: ZuoraHolidayStop, sf: HolidayStopRequestDetails): Boolean =
      z.subscriptionName == sf.request.Subscription_Name__c.value &&
        (sf.zuoraRefs exists { zuoraRefs =>
          zuoraRefs exists { zuoraRef =>
            z.chargeNumber == zuoraRef.chargeCode.value &&
              z.startDate == zuoraRef.stoppedPublicationDate.value
          }
        })

    /*
     * This is used to find the corresponding request ID for the subscription in Salesforce.
     * There should be a request ID available for each subscription and stopped publication date
     * as in the first pass the parent holiday requests will have been populated.
     */
    def correspondingRequest(stop: ZuoraHolidayStop): Option[HolidayStopRequest] =
      inSalesforce find { sfStop =>
        val startDate = Time.toJavaDate(sfStop.request.Start_Date__c.value)
        val endDate = Time.toJavaDate(sfStop.request.End_Date__c.value)
        sfStop.request.Subscription_Name__c.value == stop.subscriptionName &&
          (startDate.isBefore(stop.startDate) || startDate.isEqual(stop.startDate)) &&
          (endDate.isEqual(stop.endDate) || endDate.isAfter(stop.endDate))
      } map { _.request }

    val zuoraRefs = for {
      stop <- stoppedPublications.filterNot(zuoraStop => inSalesforce.exists(sfStop => isSame(zuoraStop, sfStop)))
      sfRequest <- correspondingRequest(stop)
    } yield {
      HolidayStopRequestActionedZuoraRef(
        sfRequest.Id,
        HolidayStopRequestActionedZuoraChargeCode(stop.chargeNumber),
        HolidayStopRequestActionedZuoraChargePrice(stop.creditPrice),
        StoppedPublicationDate(stop.startDate)
      )
    }

    zuoraRefs.distinct
  }

  def holidayStopRequestsAddedToSalesforce(sfCredentials: SFAuthConfig, dryRun: Boolean)(requests: Seq[NewHolidayStopRequest]): Either[SalesforceUpdateFailure, Unit] =
    if (dryRun) {
      println("++++++++++++++++++++++++++++++")
      requests.foreach(println)
      println("++++++++++++++++++++++++++++++")
      Right(())
    } else Salesforce.holidayStopCreateResponse(sfCredentials)(requests)

  def zuoraRefsAddedToSalesforce(sfCredentials: SFAuthConfig, dryRun: Boolean)(zuoraRefs: Seq[HolidayStopRequestActionedZuoraRef]): Either[SalesforceUpdateFailure, Unit] =
    if (dryRun) {
      println("-----------------------------")
      zuoraRefs.foreach(println)
      println("-----------------------------")
      Right(())
    } else Salesforce.holidayStopUpdateResponse(sfCredentials)(zuoraRefs)
}
