package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class DigitalVoucherPlans(
  getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate
) {

  import PaperDays._
  private val DigitalVoucherStartDateWindowSize = WindowSizeDays(1)

  private def digitalVoucherStartDateRule(daysOfWeek: List[DayOfWeek]) =
    StartDateRules(
      daysOfWeekRule = Some(DaysOfWeekRule(daysOfWeek)),
      windowRule = WindowRule(
        startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperDigitalVoucher, daysOfWeek),
        maybeSize = Some(DigitalVoucherStartDateWindowSize),
      ),
    )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (
      DigitalVoucherWeekend,
      PlanDescription("Weekend"),
      digitalVoucherStartDateRule(weekendDays),
      Monthly,
    ),
    (
      DigitalVoucherWeekendPlus,
      PlanDescription("Weekend+"),
      digitalVoucherStartDateRule(weekendDays),
      Monthly,
    ),
    (
      DigitalVoucherEveryday,
      PlanDescription("Everyday"),
      digitalVoucherStartDateRule(everyDayDays),
      Monthly,
    ),
    (
      DigitalVoucherEverydayPlus,
      PlanDescription("Everyday+"),
      digitalVoucherStartDateRule(everyDayDays),
      Monthly,
    ),
    (
      DigitalVoucherSaturday,
      PlanDescription("Saturday"),
      digitalVoucherStartDateRule(saturdayDays),
      Monthly,
    ),
    (
      DigitalVoucherSaturdayPlus,
      PlanDescription("Saturday+"),
      digitalVoucherStartDateRule(saturdayDays),
      Monthly,
    ),
    (
      DigitalVoucherSunday,
      PlanDescription("Sunday"),
      digitalVoucherStartDateRule(sundayDays),
      Monthly,
    ),
    (
      DigitalVoucherSundayPlus,
      PlanDescription("Sunday+"),
      digitalVoucherStartDateRule(sundayDays),
      Monthly,
    ),
    (
      DigitalVoucherSixday,
      PlanDescription("Sixday"),
      digitalVoucherStartDateRule(sixDayDays),
      Monthly,
    ),
    (
      DigitalVoucherSixdayPlus,
      PlanDescription("Sixday+"),
      digitalVoucherStartDateRule(sixDayDays),
      Monthly,
    ),
  )

}
