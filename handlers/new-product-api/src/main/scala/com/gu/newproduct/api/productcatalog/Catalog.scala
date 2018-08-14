package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
import java.time.DayOfWeek._

import com.gu.newproduct.api.productcatalog.PlanId._

case class Catalog(
  voucherWeekend: Plan,
  voucherEveryDay: Plan,
  monthlyContribution: Plan
)

object NewProductApi {
  val catalog: Catalog = {
    def monthlyPayment(priceInPounds: String) = Some(PaymentPlan(s"£$priceInPounds every month"))
    val voucherWindowRule = WindowRule(
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(28))
    )

    def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(Some(DaysOfWeekRule(allowedDays)), Some(voucherWindowRule))

    val voucherMondayRules = voucherDateRules(List(MONDAY))
    val voucherSundayDateRules = voucherDateRules(List(SUNDAY))
    val voucherSaturdayDateRules = voucherDateRules(List(SATURDAY))

    val voucherWeekend = Plan(VoucherWeekend, voucherSaturdayDateRules, monthlyPayment("20.76"))
    val voucherEveryDay = Plan(VoucherEveryDay, voucherMondayRules, monthlyPayment("47.62"))
    val voucherSixDay = Plan(VoucherSixDay, voucherMondayRules, monthlyPayment("41.12"))
    val voucherSaturday = Plan(VoucherSaturday, voucherSaturdayDateRules, monthlyPayment("10.36"))
    val voucherSunday = Plan(VoucherSunday, voucherSundayDateRules, monthlyPayment("10.79"))

    val voucherWeekendPlus = Plan(VoucherWeekendPlus, voucherSaturdayDateRules, monthlyPayment("29.42"))
    val voucherEveryDayPlus = Plan(VoucherEveryDayPlus, voucherMondayRules, monthlyPayment("51.96"))
    val voucherSixDayPlus = Plan(VoucherSixDayPlus, voucherMondayRules, monthlyPayment("47.62"))
    val voucherSaturdayPlus = Plan(VoucherSaturdayPlus, voucherSaturdayDateRules, monthlyPayment("21.62"))
    val voucherSundayPlus = Plan(VoucherSundayPlus, voucherSundayDateRules, monthlyPayment("22.06"))

    val monthlyContributionWindow = WindowRule(
      maybeSize = Some(WindowSizeDays(1)),
      maybeCutOffDay = None,
      maybeStartDelay = None
    )
    val monthlyContributionRules = StartDateRules(windowRule = Some(monthlyContributionWindow))
    val monthlyContribution = Plan(MonthlyContribution, monthlyContributionRules)
    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}

sealed abstract class PlanId(val name: String)

object PlanId {

  case object MonthlyContribution extends PlanId("monthly_contribution")

  case object VoucherWeekend extends PlanId("voucher_weekend")
  case object VoucherEveryDay extends PlanId("voucher_everyday")
  case object VoucherSixDay extends PlanId("voucher_sixday")
  case object VoucherSaturday extends PlanId("voucher_saturday")
  case object VoucherSunday extends PlanId("voucher_sunday")

  case object VoucherWeekendPlus extends PlanId("voucher_weekend_plus")
  case object VoucherEveryDayPlus extends PlanId("voucher_everyday_plus")
  case object VoucherSixDayPlus extends PlanId("voucher_sixday_plus")
  case object VoucherSaturdayPlus extends PlanId("voucher_saturday_plus")
  case object VoucherSundayPlus extends PlanId("voucher_sunday_plus")

  val supported = List(MonthlyContribution)

  def fromName(name: String): Option[PlanId] = supported.find(_.name == name)
}

case class Plan(id: PlanId, startDateRules: StartDateRules = StartDateRules(), paymentPlan: Option[PaymentPlan] = None)

case class PaymentPlan(description: String)

case class DelayDays(value: Int) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule
