package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class DigitalVoucherPlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {

  import PaperDays._
  private def startDateRule(daysOfWeek: List[DayOfWeek]) =
    StartDateRules(
      daysOfWeekRule = Some(DaysOfWeekRule(daysOfWeek)),
      windowRule = WindowRule(
        startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperDigitalVoucher, daysOfWeek),
        maybeSize = Some(WindowSizeDays(1)),
      ),
    )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (
      DigitalVoucherWeekend,
      PlanDescription("Weekend"),
      startDateRule(weekendDays),
      Monthly,
    ),
    (
      DigitalVoucherWeekendPlus,
      PlanDescription("Weekend+"),
      startDateRule(weekendDays),
      Monthly,
    ),
    (
      DigitalVoucherEveryday,
      PlanDescription("Everyday"),
      startDateRule(everyDayDays),
      Monthly,
    ),
    (
      DigitalVoucherEverydayPlus,
      PlanDescription("Everyday+"),
      startDateRule(everyDayDays),
      Monthly,
    ),
    (
      DigitalVoucherSaturday,
      PlanDescription("Saturday"),
      startDateRule(saturdayDays),
      Monthly,
    ),
    (
      DigitalVoucherSaturdayPlus,
      PlanDescription("Saturday+"),
      startDateRule(saturdayDays),
      Monthly,
    ),
    (
      DigitalVoucherSunday,
      PlanDescription("Sunday"),
      startDateRule(sundayDays),
      Monthly,
    ),
    (
      DigitalVoucherSundayPlus,
      PlanDescription("Sunday+"),
      startDateRule(sundayDays),
      Monthly,
    ),
    (
      DigitalVoucherSixday,
      PlanDescription("Sixday"),
      startDateRule(sixDayDays),
      Monthly,
    ),
    (
      DigitalVoucherSixdayPlus,
      PlanDescription("Sixday+"),
      startDateRule(sixDayDays),
      Monthly,
    ),
  )

}
