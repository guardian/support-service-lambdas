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

  /*
   * Zuora takes 3-4s to add each credit to a sub so this should take ~ 10 mins,
   * which is within the 15 min max that a lambda can run.
   * As the lambda runs each hour, all should easily be processed within the
   * 24 hour window available.
   *
   * Beware! This isn't a scalable solution.  If all the products between them
   * have > 5000 credit requests to be processed in a 24 hour window some will be missed.
   */
  private val batchSize = 66

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productVariant: ZuoraProductType, datesToProcess: List[LocalDate]): SalesforceApiResponse[List[HolidayStopRequestsDetail]] = {
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      FetchHolidayStopRequestsDetailsForProductType(sfGet)(datesToProcess, productVariant)
    }.toDisjunction match {
      case Left(failure) => Left(SalesforceApiFailure(failure.toString))
      case Right(details) =>
        logger.info(s"There are ${details.length} credit requests from Salesforce to process")
        if (details.length > batchSize) logger.warn(s"Only processing $batchSize of ${details.length} requests")
        Right(details.take(batchSize))
    }
  }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: List[ZuoraHolidayCreditAddResult]): SalesforceApiResponse[Unit] =
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
