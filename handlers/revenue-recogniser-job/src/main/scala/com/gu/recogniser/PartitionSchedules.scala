package com.gu.recogniser

import java.time.LocalDate

case class DistributeRange(refundSchedule: String, recognitionStart: LocalDate, recognitionEnd: LocalDate)
case class DistributeToday(expiredCodeSchedule: String)

class PartitionSchedules(
    today: () => LocalDate,
    log: String => Unit,
    error: String => Unit,
) {

  def oneYearAgo: LocalDate = today().minusYears(1)

  def partition(
      schedules: List[(RevenueScheduleAquaRow, GetSubscription.GetSubscriptionResponse)],
  ): (List[DistributeToday], List[DistributeRange]) = {
    schedules.foldRight((List.empty[DistributeToday], List.empty[DistributeRange])) {
      case (next, (todaySoFar, rangeSoFar)) =>
        next match {
          case (
                RevenueScheduleAquaRow(expiredCodeSchedule, _, _),
                GetSubscription.GetSubscriptionResponse(_, /* isRedeemed = */ false, termStartDate, _, _),
              ) if termStartDate.isBefore(oneYearAgo) =>
            // Find all undistributed rev sch on unredeemed subs >12 months old and distribute “today”
            log(s"undistributed rev sch on unredeemed sub >12 months old: $next")
            val newRecord = DistributeToday(expiredCodeSchedule)
            (newRecord :: todaySoFar, rangeSoFar)
          case (
                RevenueScheduleAquaRow(refundSchedule, _, _),
                GetSubscription.GetSubscriptionResponse(
                  Some(redemptionDate), /* isRedeemed = */ true,
                  termStartDate,
                  initialTerm,
                  initialTermPeriodType,
                ),
              ) =>
            if (initialTermPeriodType == "Day") {
              // Find all undistributed rev sch on redeemed subs and distribute across the redemptiondate->termenddate
              log(s"undistributed rev sch on redeemed sub: $next")
              val newRecord = DistributeRange(
                refundSchedule,
                redemptionDate,
                termStartDate.plusDays(initialTerm - 1),
              ) // recognition end is inclusive
              (todaySoFar, newRecord :: rangeSoFar)
            } else {
              error(s"term period incorrect for $next - expected 'Day'")
              (todaySoFar, rangeSoFar)
            }
          case other =>
            log(s"ignoring unexpired unredeemed subscription: $other")
            (todaySoFar, rangeSoFar)
        }
    }
  }

}
