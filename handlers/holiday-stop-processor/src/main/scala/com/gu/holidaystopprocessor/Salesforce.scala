package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.resthttp.RestRequestMaker.PatchRequest
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}

object Salesforce {

  private def thresholdDate: LocalDate = LocalDate.now.plusDays(Config.daysInAdvance)

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productNamePrefix: ProductName): Either[OverallFailure, Seq[HolidayStopRequestsDetail]] =
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequestsDetail.LookupPendingByProductNamePrefixAndDate(sfGet)
      fetchOp(productNamePrefix, thresholdDate)
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(details) => Right(details)
    }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: Seq[HolidayStopResponse]): Either[OverallFailure, Unit] = {

    ???

    //    def send(
    //      sendOp: HolidayStopRequestsDetailActioned => ClientFailableOp[JsValue]
    //    )(response: HolidayStopResponse): ClientFailableOp[JsValue] =
    //      sendOp(
    //        HolidayStopRequestsDetail(
    //          response.requestId,
    //          response.subscriptionName,
    //          response.productName,
    //          response.pubDate,
    //          response.estimatedPrice,
    //          Some(response.chargeCode),
    //          Some(response.actualPrice)
    //        )
    //      )
    //
    //    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
    //      val id: HolidayStopRequestsDetailId = ???
    //      val sfPatch: HttpOp[PatchRequest, JsValue] = sfAuth.wrapWith(JsonHttp.patch)
    //      val sendOp = ActionSalesforceHolidayStopRequestsDetail(sfPatch)(id)
    //      responses.map(r => send(sendOp(_)(r)).find(_.isFailure)
    //    }.toDisjunction match {
    //      case -\/(failure) => Left(OverallFailure(failure.toString))
    //      case _ => Right(())
    //    }
  }
}
