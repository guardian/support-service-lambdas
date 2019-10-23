package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.ZuoraHolidayError

case class RatePlanChargeInfo(ratePlan: RatePlanCharge, billingSchedule: BillingSchedule)

object RatePlanChargeInfo {
  def apply(ratePlanCharge: RatePlanCharge): Either[ZuoraHolidayError, RatePlanChargeInfo] = {
    BillingSchedule.forRatePlanCharge(ratePlanCharge).map(RatePlanChargeInfo(ratePlanCharge, _))
  }
}
