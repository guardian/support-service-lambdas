package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.RawEffects
import com.gu.holiday_stops.ActionCalculator.GuardianWeeklyIssueSuspensionConstants
import com.gu.holiday_stops.ProductVariant._
import com.gu.holiday_stops.{ActionCalculator, ProductVariant, SalesforceHolidayError, SalesforceHolidayResponse}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.util.resthttp.JsonHttp
import scalaz.{-\/, \/-}

object Salesforce {
  def calculateProcessDate(productVariant: ProductVariant, processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays {
      productVariant match {
        case GuardianWeekly =>
          GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays.toLong

        case SaturdayVoucher | SundayVoucher | WeekendVoucher | SixdayVoucher | EverydayVoucher | EverydayPlusVoucher | SixdayPlusVoucher | WeekendPlusVoucher | SundayPlusVoucher | SaturdayPlusVoucher =>
          ActionCalculator.VoucherProcessorLeadTime

        case _ => throw new RuntimeException(s"Unknown product $productVariant. Fix ASAP!")
      }
    })
  }

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productVariant: ProductVariant, processDateOverride: Option[LocalDate]): SalesforceHolidayResponse[List[HolidayStopRequestsDetail]] = {
    val processDate = calculateProcessDate(productVariant, processDateOverride)
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      productVariant match {
        case GuardianWeekly => FetchGuardianWeeklyHolidayStopRequestsDetails(sfGet)(processDate)
        case voucherProductVariant => FetchVoucherHolidayStopRequestsDetails(sfGet)(processDate, voucherProductVariant)
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
