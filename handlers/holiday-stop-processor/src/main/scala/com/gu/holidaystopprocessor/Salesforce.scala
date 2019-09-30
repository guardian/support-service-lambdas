package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.holiday_stops.ActionCalculator.GuardianWeeklyIssueSuspensionConstants
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import Product._
import com.gu.util.resthttp.JsonHttp
import scalaz.{-\/, \/-}
import com.gu.holiday_stops.{ActionCalculator, SalesforceHolidayError, SalesforceHolidayResponse}

object Salesforce {
  def calculateProcessDate(product: Product, processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays {
      product match {
        case GuardianWeekly =>
          GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays.toLong

        case SaturdayVoucher | SundayVoucher | WeekendVoucher | SixdayVoucher | EverydayVoucher | EverydayPlusVoucher | SixdayPlusVoucher | WeekendPlusVoucher | SundayPlusVoucher | SaturdayPlusVoucher =>
          ActionCalculator.VoucherProcessorLeadTime

        case _ => throw new RuntimeException(s"Unknown product $product. Fix ASAP!")
      }
    })
  }

  def holidayStopRequests(sfCredentials: SFAuthConfig)(product: Product, processDateOverride: Option[LocalDate]): SalesforceHolidayResponse[List[HolidayStopRequestsDetail]] = {
    val processDate = calculateProcessDate(product, processDateOverride)
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      product match {
        case GuardianWeekly => LookupPendingByProductNamePrefixAndDate(sfGet)(GuardianWeekly, processDate)
        case voucher => FetchVoucherHolidayStopRequestsDetails(sfGet)(voucher, processDate)
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
