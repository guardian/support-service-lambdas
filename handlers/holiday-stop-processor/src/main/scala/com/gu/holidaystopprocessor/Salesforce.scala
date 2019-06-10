package com.gu.holidaystopprocessor

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef._
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientFailableOp
import org.joda.time.LocalDate
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}

object Salesforce {

  private def thresholdDate: LocalDate = LocalDate.now.plusDays(Config.daysInAdvance)

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productNamePrefix: String): Either[OverallFailure, Seq[HolidayStopRequest]] =
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequest.LookupByDateAndProductNamePrefix(sfGet)
      fetchOp(thresholdDate, SalesforceHolidayStopRequest.ProductName(productNamePrefix))
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(requests) => Right(requests)
    }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: Seq[HolidayStopResponse]): Either[OverallFailure, Unit] = {

    def send(
      sendOp: HolidayStopRequestActionedZuoraRef => ClientFailableOp[JsValue]
    )(response: HolidayStopResponse): ClientFailableOp[JsValue] =
      sendOp(
        HolidayStopRequestActionedZuoraRef(
          response.requestId,
          response.amendmentCode,
          response.price
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
