package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.ProductName
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}

object Salesforce {

  private def thresholdDate: LocalDate = LocalDate.now.plusDays(Config.daysInAdvance)

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productNamePrefix: ProductName): Either[OverallFailure, Seq[HolidayStopRequestDetails]] =
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequestsDetail.LookupByProductNamePrefixAndDate(sfGet)
      fetchOp(productNamePrefix, thresholdDate)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(details) => Right(details)
    }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: Seq[HolidayStopResponse]): Either[OverallFailure, Unit] = {

    def send(
      sendOp: HolidayStopRequestsDetail => ClientFailableOp[JsValue]
    )(response: HolidayStopResponse): ClientFailableOp[JsValue] =
      sendOp(
        HolidayStopRequestsDetail(
          response.requestId,
          response.chargeCode,
          response.price,
          response.pubDate
        )
      )

    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.post)
      val sendOp = CreatePendingSalesforceHolidayStopRequestsDetail(sfGet)
      responses.map(send(sendOp)).find(_.isFailure)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case _ => Right(())
    }
  }
}
