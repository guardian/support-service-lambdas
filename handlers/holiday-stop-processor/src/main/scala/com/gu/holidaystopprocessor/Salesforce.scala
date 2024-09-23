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

  /** In August 2024 some issues around scale became apparent:
    * https://docs.google.com/document/d/1yw21fs1sW41qrtQNdOhlPbclXdsi4zvZV4W8iIl_GIE/edit#heading=h.p2ta3sj6yk1r
    *
    * After some investigation and discussion, the following document was produced with options for improvement:
    *
    * https://docs.google.com/document/d/1ac4UF2Pe3Kh9KiOdpvj8-XUlPxgNFEnPqW2UL1-02ns/edit
    *
    * For now we seem to handle ~800 per invocation and keeping the batching a bit lower than threshold assures some
    * progress is saved and there isn't slow down due to starvation
    */

  private val batchSize = 700

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
        if (details.length > batchSize) logger.warn(s"Only processing $batchSize of ${details.length} requests")
        Right(details.take(batchSize))
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
