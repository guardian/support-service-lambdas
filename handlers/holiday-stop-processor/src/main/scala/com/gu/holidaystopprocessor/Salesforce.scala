package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.holiday_stops.ActionCalculator.{GuardianWeeklyIssueSuspensionConstants, SundayVoucherIssueSuspensionConstants}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductRatePlanKey, _}
import com.gu.util.resthttp.JsonHttp
import scalaz.{-\/, \/-}
import com.gu.holiday_stops.{SalesforceHolidayError, SalesforceHolidayResponse}

object Salesforce {
  def calculateProcessDate(product: Product, processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays {
      product match {
        case SundayVoucher => SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays.toLong
        case GuardianWeekly => GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays.toLong
      }
    })
  }

  def holidayStopRequests(sfCredentials: SFAuthConfig)(product: Product, processDateOverride: Option[LocalDate]): SalesforceHolidayResponse[List[HolidayStopRequestsDetail]] = {
    val processDate = calculateProcessDate(product, processDateOverride)
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      product match {
        case SundayVoucher =>
          val fetchOp = SalesforceHolidayStopRequestsDetail.FetchSundayVoucherHolidayStopRequestsDetails(sfGet)
          fetchOp(ProductRatePlanKey(SundayVoucher), processDate)

        case GuardianWeekly =>
          val fetchOp = SalesforceHolidayStopRequestsDetail.LookupPendingByProductNamePrefixAndDate(sfGet)
          fetchOp(ProductName("Guardian Weekly"), processDate)
      }
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
