package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
import java.time.DayOfWeek.{_}

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.productcatalog.PlanId._

object NewProductApi {
  def catalog(priceFor: PlanId => Option[AmountMinorUnits]): Catalog = {

    def paymentPlanFor = priceFor andThen { maybeAmount =>
      maybeAmount.map(amount => PaymentPlan(s"GBP ${amount.formatted} every month"))
    }

    val voucherWindowRule = WindowRule(
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(35))
    )

    def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules((DaysOfWeekRule(allowedDays)), Some(voucherWindowRule))

    val voucherMondayRules = voucherDateRules(List(MONDAY))
    val voucherSundayDateRules = voucherDateRules(List(SUNDAY))
    val voucherSaturdayDateRules = voucherDateRules(List(SATURDAY))

    val homeDeliveryWindowRule = WindowRule(
      maybeCutOffDay = None,
      maybeStartDelay = Some(DelayDays(3)),
      maybeSize = Some(WindowSizeDays(28))
    )

    def homeDeliveryDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(DaysOfWeekRule(allowedDays), Some(homeDeliveryWindowRule))


    val weekDays = List(
      MONDAY,
      TUESDAY,
      WEDNESDAY,
      THURSDAY,
      FRIDAY
    )

    val weekendDays = List(
      SATURDAY,
      SUNDAY
    )

    val everyDay = weekDays ++ weekendDays

    val homeDeliveryEveryDayRules = homeDeliveryDateRules(everyDay)
    val homeDeliverySixDayRules = homeDeliveryDateRules(weekDays ++ List(SATURDAY))
    val homeDeliverySundayDateRules = homeDeliveryDateRules(List(SUNDAY))
    val homeDeliverySaturdayDateRules = homeDeliveryDateRules(List(SATURDAY))
    val homeDeliveryWeekendRules = homeDeliveryDateRules(weekendDays)
    val monthlyContributionWindow = WindowRule(
      maybeSize = Some(WindowSizeDays(1)),
      maybeCutOffDay = None,
      maybeStartDelay = None
    )
    val contributionRules = StartDateRules(windowRule = Some(monthlyContributionWindow))

    def planWithPayment(
      planId: PlanId,
      planDescription: PlanDescription,
      startDateRules: StartDateRules
    ) = Plan(planId, planDescription, startDateRules, paymentPlanFor(planId))

    Catalog(
      voucherWeekendPlus = planWithPayment(VoucherWeekendPlus, PlanDescription("Weekend+"), voucherSaturdayDateRules),
      voucherWeekend = planWithPayment(VoucherWeekend, PlanDescription("Weekend"), voucherSaturdayDateRules),
      voucherSixDay = planWithPayment(VoucherSixDay, PlanDescription("Sixday"), voucherMondayRules),
      voucherSixDayPlus = planWithPayment(VoucherSixDayPlus, PlanDescription("Sixday+"), voucherMondayRules),
      voucherEveryDay = planWithPayment(VoucherEveryDay, PlanDescription("Everyday"), voucherMondayRules),
      voucherEveryDayPlus = planWithPayment(VoucherEveryDayPlus, PlanDescription("Everyday+"), voucherMondayRules),
      voucherSaturday = planWithPayment(VoucherSaturday, PlanDescription("Saturday"), voucherSaturdayDateRules),
      voucherSaturdayPlus = planWithPayment(VoucherSaturdayPlus, PlanDescription("Saturday+"), voucherSaturdayDateRules),
      voucherSunday = planWithPayment(VoucherSunday, PlanDescription("Sunday"), voucherSundayDateRules),
      voucherSundayPlus = planWithPayment(VoucherSundayPlus, PlanDescription("Sunday+"), voucherSundayDateRules),
      monthlyContribution = planWithPayment(MonthlyContribution, PlanDescription("Monthly"), contributionRules),
      annualContribution = planWithPayment(AnnualContribution, PlanDescription("Annual"), contributionRules),
      homeDeliveryEveryDay = planWithPayment(HomeDeliveryEveryDay, PlanDescription("Everyday"), homeDeliveryEveryDayRules),
      homeDeliverySunday = planWithPayment(HomeDeliverySunday, PlanDescription("Sunday"), homeDeliverySundayDateRules),
      homeDeliverySixDay = planWithPayment(HomeDeliverySixDay, PlanDescription("Sixday"), homeDeliverySixDayRules),
      homeDeliveryWeekend = planWithPayment(HomeDeliveryWeekend, PlanDescription("Weekend"), homeDeliveryWeekendRules),
      homeDeliveryEveryDayPlus = planWithPayment(HomeDeliveryEveryDayPlus, PlanDescription("Everyday+"), homeDeliveryEveryDayRules),
      homeDeliverySundayPlus = planWithPayment(HomeDeliverySundayPlus, PlanDescription("Sunday+"), homeDeliverySundayDateRules),
      homeDeliverySixDayPlus = planWithPayment(HomeDeliverySixDayPlus, PlanDescription("Sixday+"), homeDeliverySixDayRules),
      homeDeliveryWeekendPlus = planWithPayment(HomeDeliveryWeekendPlus, PlanDescription("Weekend+"), homeDeliveryWeekendRules),
      homeDeliverySaturday = planWithPayment(HomeDeliverySaturday, PlanDescription("Saturday"), homeDeliverySaturdayDateRules),
      homeDeliverySaturdayPlus = planWithPayment(HomeDeliverySaturdayPlus, PlanDescription("Saturday+"), homeDeliverySaturdayDateRules),
    )
  }

}
