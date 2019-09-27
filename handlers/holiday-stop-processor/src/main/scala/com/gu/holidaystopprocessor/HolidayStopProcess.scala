package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator.{GuardianWeeklyIssueSuspensionConstants, SundayVoucherIssueSuspensionConstants}
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductRatePlanKey, ProductRatePlanName, ProductType}
import com.softwaremill.sttp.{Id, SttpBackend}

object HolidayStopProcess {

  val sundayVoucher = ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday"))
  val guardianWeekly = ProductRatePlanKey(ProductType("Guardian Weekly"), ProductRatePlanName(""))

  def calculateProcessDate(product: ProductRatePlanKey, processDateOverride: Option[LocalDate]) = {
    product match {
      case ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday")) =>
        processDateOverride.getOrElse(LocalDate.now.plusDays(SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays))

      case ProductRatePlanKey(ProductType("Guardian Weekly"), _) =>
        processDateOverride.getOrElse(LocalDate.now.plusDays(GuardianWeeklyIssueSuspensionConstants.processorRunLeadTimeDays))
    }
  }

  def apply(config: Config, processDateOverride: Option[LocalDate], backend: SttpBackend[Id, Nothing]): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(overallFailure) =>
        List(ProcessResult(overallFailure))

      case Right(zuoraAccessToken) =>

        List(
          CommonHolidayStopProcessor.processHolidayStops(
            config,
            Salesforce.holidayStopRequests(config.sfConfig)(sundayVoucher, calculateProcessDate(sundayVoucher, processDateOverride)),
            _, _, _
          ),
          CommonHolidayStopProcessor.processHolidayStops(
            config,
            Salesforce.holidayStopRequests(config.sfConfig)(guardianWeekly, calculateProcessDate(guardianWeekly, processDateOverride)),
            _, _, _
          )
        ) map {
            _.apply(
              Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
              Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
              Salesforce.holidayStopUpdateResponse(config.sfConfig)
            )
          }
    }
}
