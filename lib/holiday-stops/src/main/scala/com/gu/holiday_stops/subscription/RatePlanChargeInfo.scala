package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.ZuoraHolidayError
import acyclic.skipped

case class RatePlanChargeInfo(
  ratePlanCharge: RatePlanCharge,
  billingSchedule: RatePlanChargeBillingSchedule,
  billingPeriodName: String
)

object RatePlanChargeInfo {
  def apply(ratePlanCharge: RatePlanCharge): Either[ZuoraHolidayError, RatePlanChargeInfo] = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      schedule <- RatePlanChargeBillingSchedule(ratePlanCharge)
    } yield RatePlanChargeInfo(ratePlanCharge, schedule, billingPeriodName)
  }
}
