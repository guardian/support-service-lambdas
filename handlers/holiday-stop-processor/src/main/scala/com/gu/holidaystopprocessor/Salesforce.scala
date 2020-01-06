package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.holiday_stops.{SalesforceHolidayError, SalesforceHolidayResponse}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.resthttp.JsonHttp
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import scalaz.{-\/, \/-}

object Salesforce {

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productVariant: ZuoraProductType, datesToProcess: List[LocalDate]): SalesforceHolidayResponse[List[HolidayStopRequestsDetail]] = {
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      FetchHolidayStopRequestsDetailsForProductType(sfGet)(datesToProcess, productVariant)
    }.toDisjunction match {
      case -\/(failure) => Left(SalesforceHolidayError(failure.toString))
      case \/-(details) => Right(details)
    }
  }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: List[ZuoraHolidayWriteResult]): SalesforceHolidayResponse[Unit] =
    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
      val patch = sfAuth.wrapWith(JsonHttp.patch)
      val sendOp = ActionSalesforceHolidayStopRequestsDetail(patch) _
      responses map { response =>
        val actioned = HolidayStopRequestsDetailActioned(response.chargeCode, response.actualPrice)
        sendOp(response.requestId)(actioned)
      }
    }.toDisjunction match {
      case -\/(failure) => Left(SalesforceHolidayError(failure.toString))
      case _ => Right(())
    }
}
