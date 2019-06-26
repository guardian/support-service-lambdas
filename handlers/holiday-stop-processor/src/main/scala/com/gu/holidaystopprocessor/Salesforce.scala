package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, ProductName}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef._
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceHolidayStopRequestActionedZuoraRef}
import com.gu.util.Time
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}

object Salesforce {

  private def thresholdDate: LocalDate = LocalDate.now.plusDays(Config.daysInAdvance.toLong)

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productNamePrefix: ProductName): Either[OverallFailure, Seq[HolidayStopRequest]] =
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequest.LookupByDateAndProductNamePrefix(sfGet)
      fetchOp(Time.toJodaDate(thresholdDate), productNamePrefix)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(requests) => Right(requests)
    }

  def holidayStopRequestDetails(sfCredentials: SFAuthConfig)(productNamePrefix: ProductName, startThreshold: LocalDate, endThreshold: LocalDate): Either[OverallFailure, Seq[HolidayStopRequestDetails]] = {
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequestActionedZuoraRef.LookupByProductNamePrefixAndDateRange(sfGet)
      fetchOp(productNamePrefix, startThreshold, endThreshold)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(details) => Right(details)
    }
  }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: Seq[HolidayStopResponse]): Either[OverallFailure, Unit] = {

    def send(
      sendOp: HolidayStopRequestActionedZuoraRef => ClientFailableOp[JsValue]
    )(response: HolidayStopResponse): ClientFailableOp[JsValue] =
      sendOp(
        HolidayStopRequestActionedZuoraRef(
          response.requestId,
          response.chargeCode,
          response.price,
          response.pubDate
        )
      )

    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.post)
      val sendOp = CreateHolidayStopRequestActionedZuoraRef(sfGet)
      responses.map(send(sendOp)).find(_.isFailure)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case _ => Right(())
    }
  }
}
