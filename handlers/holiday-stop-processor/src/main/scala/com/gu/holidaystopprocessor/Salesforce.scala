package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.salesforce.{SFAuthConfig, SalesforceClient}
import com.gu.util.resthttp.JsonHttp
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import com.gu.zuora.subscription.{SalesforceApiFailure, SalesforceApiResponse}
import com.typesafe.scalalogging.LazyLogging

object Salesforce extends LazyLogging {

  def holidayStopRequests(sfCredentials: SFAuthConfig)(
      productVariant: ZuoraProductType,
      datesToProcess: List[LocalDate],
  ): SalesforceApiResponse[List[HolidayStopRequestsDetail]] = {
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      FetchHolidayStopRequestsDetailsForProductType(sfGet)(datesToProcess, productVariant)
    }.toDisjunction match {
      case Left(failure) => Left(SalesforceApiFailure(failure.toString))
      case Right(details) =>
        logger.info(
          s"There are ${details.length} credit requests from Salesforce to process for '${productVariant.name}'",
        )
        Right(details)
    }
  }

  def holidayStopUpdateResponse(
      sfCredentials: SFAuthConfig,
  )(responses: List[ZuoraHolidayCreditAddResult]): SalesforceApiResponse[Unit] =
    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
      val patch = sfAuth.wrapWith(JsonHttp.patch)
      val sendOp = ActionSalesforceHolidayStopRequestsDetail(patch) _
      responses map { response =>
        val actioned = HolidayStopRequestsDetailActioned(response.chargeCode, response.actualPrice)
        sendOp(response.requestId)(actioned)
      }
    }.toDisjunction match {
      case Left(failure) => Left(SalesforceApiFailure(failure.toString))
      case _ => Right(())
    }
}
