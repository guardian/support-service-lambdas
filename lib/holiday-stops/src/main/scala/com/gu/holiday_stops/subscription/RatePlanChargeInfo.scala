package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.ZuoraHolidayError
import acyclic.skipped

case class RatePlanChargeInfo(ratePlan: RatePlanCharge, billingSchedule: BillingSchedule)

object RatePlanChargeInfo {
  def apply(ratePlanCharge: RatePlanCharge): Either[ZuoraHolidayError, RatePlanChargeInfo] = {
    BillingSchedule.forRatePlanCharge(ratePlanCharge).map(RatePlanChargeInfo(ratePlanCharge, _))
  }
}
