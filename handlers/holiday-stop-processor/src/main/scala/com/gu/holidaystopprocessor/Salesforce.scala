package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.resthttp.JsonHttp
import scalaz.{-\/, \/-}
import com.gu.holiday_stops.ActionCalculator.suspensionConstantsByProduct
import com.gu.holiday_stops.{OverallFailure, SalesforceHolidayWriteError}

object Salesforce {

  def holidayStopRequests(sfCredentials: SFAuthConfig, processDateOverride: Option[LocalDate])(productNamePrefix: ProductName): Either[OverallFailure, List[HolidayStopRequestsDetail]] = {
    val processDate = LocalDate.now.plusDays(
      suspensionConstantsByProduct(productNamePrefix).processorRunLeadTimeDays
    )

    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      val fetchOp = SalesforceHolidayStopRequestsDetail.LookupPendingByProductNamePrefixAndDate(sfGet)
      fetchOp(productNamePrefix, processDateOverride.getOrElse(processDate))
    }.toDisjunction match {
      case -\/(failure) => Left(OverallFailure(failure.toString))
      case \/-(details) => Right(details)
    }

  }

  def holidayStopUpdateResponse(sfCredentials: SFAuthConfig)(responses: List[HolidayStopResponse]): Either[SalesforceHolidayWriteError, Unit] =
    SalesforceClient(RawEffects.response, sfCredentials).value.map { sfAuth =>
      val patch = sfAuth.wrapWith(JsonHttp.patch)
      val sendOp = ActionSalesforceHolidayStopRequestsDetail(patch) _
      responses map { response =>
        val actioned = HolidayStopRequestsDetailActioned(response.chargeCode, response.actualPrice)
        sendOp(response.requestId)(actioned)
      }
    }.toDisjunction match {
      case -\/(failure) => Left(SalesforceHolidayWriteError(failure.toString))
      case _ => Right(())
    }
}
