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
import com.gu.holiday_stops.{OverallFailure, SalesforceHolidayWriteError}

object Salesforce {
  def calculateProcessDate(product: ProductRatePlanKey, processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays {
      product match {
        case ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday")) => SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays
        case ProductRatePlanKey(ProductType("Guardian Weekly"), _) => GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays
      }
    })
  }

  def holidayStopRequests(sfCredentials: SFAuthConfig)(productKey: ProductRatePlanKey, processDateOverride: Option[LocalDate]): Either[OverallFailure, List[HolidayStopRequestsDetail]] = {
    val processDate = calculateProcessDate(productKey, processDateOverride)
    SalesforceClient(RawEffects.response, sfCredentials).value.flatMap { sfAuth =>
      val sfGet = sfAuth.wrapWith(JsonHttp.getWithParams)
      productKey match {
        case ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday")) =>
          val fetchOp = SalesforceHolidayStopRequestsDetail.FetchSundayVoucherHolidayStopRequestsDetails(sfGet)
          fetchOp(productKey, processDate)

        case ProductRatePlanKey(ProductType("Guardian Weekly"), _) =>
          val fetchOp = SalesforceHolidayStopRequestsDetail.LookupPendingByProductNamePrefixAndDate(sfGet)
          fetchOp(ProductName(productKey.productType.value), processDate)
      }
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
