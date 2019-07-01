package com.gu.holidaystopbackfill

import java.time.temporal.ChronoUnit
import java.time.{DayOfWeek, LocalDate}

import cats.implicits._
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, ProductName, SubscriptionName, SubscriptionNameLookup}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraChargeCode, HolidayStopRequestActionedZuoraChargePrice, HolidayStopRequestActionedZuoraRef, HolidayStopRequestDetails, StoppedPublicationDate}
import com.gu.util.Time
import com.softwaremill.sttp.Response
import io.circe.generic.auto._
import io.circe.parser.decode

case class ZuoraHolidayStop(subscriptionName: String, chargeNumber: String, startDate: LocalDate, endDate: LocalDate, creditPrice: Double)

object ZuoraHolidayStop {

  private def preexistingHolidayStopQuery(startThreshold: LocalDate, endThreshold: LocalDate): String = s"""
    | select s.name subscriptionName, c.chargeNumber, c.holidaystart__c startDate,
    |   c.holidayend__c endDate, t.price creditPrice
    | from rateplanchargetier t
    | join rateplancharge c on t.rateplanchargeid = c.id
    | join rateplan p on c.rateplanid = p.id
    | join subscription s on p.subscriptionid = s.id
    | where c.name = 'Holiday Credit'
    | and c.holidaystart__c >= '${startThreshold.toString}'
    | and c.holidaystart__c <= '${endThreshold.toString}'
    | and p.name = 'Guardian Weekly Holiday Credit'
    | order by s.name, c.chargenumber
  """.stripMargin

  def holidayStopsAlreadyInZuora(queryResponse: String => Response[String])(start: LocalDate, end: Option[LocalDate]): Either[ZuoraFetchFailure, Seq[ZuoraHolidayStop]] = {
    val response = queryResponse(preexistingHolidayStopQuery(start, end.getOrElse(LocalDate.MAX)))
    def decodeMultiline(s: String): Either[ZuoraFetchFailure, Seq[ZuoraHolidayStop]] = {
      val failureOrList = s.split('\n').map { line =>
        decode[ZuoraHolidayStop](line).left.map(e => ZuoraFetchFailure(e.getMessage))
      }.toList.sequence
      failureOrList
    }
    for {
      body <- response.body.left.map(ZuoraFetchFailure)
      stop <- decodeMultiline(body)
    } yield stop
  }
}

object SalesforceHolidayStop {

  def holidayStopsAlreadyInSalesforce(sfCredentials: SFAuthConfig)(start: LocalDate, end: Option[LocalDate]): Either[SalesforceFetchFailure, Seq[HolidayStopRequestDetails]] = {
    Salesforce.holidayStopRequestDetails(sfCredentials)(ProductName("Guardian Weekly"), start, end.getOrElse(LocalDate.MAX))
  }

  def holidayStopRequestsToBeBackfilled(inZuora: Seq[ZuoraHolidayStop], inSalesforce: Seq[HolidayStopRequestDetails]): Seq[NewHolidayStopRequest] = {

    val salesforceSubscriptionNames = inSalesforce.map(_.subscriptionName.value)

    inZuora
      .filterNot { zuoraStop =>
        salesforceSubscriptionNames.contains(zuoraStop.subscriptionName)
      }
      .map { zuoraStop =>
        NewHolidayStopRequest(
          HolidayStopRequestStartDate(Time.toJodaDate(zuoraStop.startDate)),
          HolidayStopRequestEndDate(Time.toJodaDate(zuoraStop.endDate)),
          SubscriptionNameLookup(SubscriptionName(zuoraStop.subscriptionName))
        )
      }
      .distinct
  }

  def zuoraRefsToBeBackfilled(inZuora: Seq[ZuoraHolidayStop], inSalesforce: Seq[HolidayStopRequestDetails]): Seq[HolidayStopRequestActionedZuoraRef] = {

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
      z.subscriptionName == sf.subscriptionName.value &&
        z.chargeNumber == sf.chargeCode.value &&
        z.startDate == sf.stoppedPublicationDate.value

    /*
     * This map is used to find the corresponding request ID for the subscription in Salesforce.
     * There should be a request ID available for each subscription and stopped publication date
     * as in the first pass the parent holiday requests will have been populated.
     */
    val sfRequestIds = inSalesforce
      .map { sfStop => (sfStop.subscriptionName, sfStop.stoppedPublicationDate) -> sfStop.requestId }
      .toMap

    stoppedPublications
      .filterNot { zuoraStop => inSalesforce.exists { sfStop => isSame(zuoraStop, sfStop) } }
      .map { stop =>
        HolidayStopRequestActionedZuoraRef(
          sfRequestIds((SubscriptionName(stop.subscriptionName), StoppedPublicationDate(stop.startDate))),
          HolidayStopRequestActionedZuoraChargeCode(stop.chargeNumber),
          HolidayStopRequestActionedZuoraChargePrice(stop.creditPrice),
          StoppedPublicationDate(stop.startDate)
        )
      }
      .distinct
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
