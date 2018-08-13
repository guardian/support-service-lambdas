package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
import java.time.DayOfWeek._

import com.gu.newproduct.api.productcatalog.PlanId.{MonthlyContribution, VoucherEveryDay, VoucherWeekend}

case class Catalog(
  voucherWeekend: Plan,
  voucherEveryDay: Plan,
  monthlyContribution: Plan
)

object NewProductApi {
  val catalog: Catalog = {
    val voucherWindowRule = WindowRule(
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val mondayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekendDateRules = StartDateRules(Some(weekendRule), Some(voucherWindowRule))
    val voucherWeekend = Plan(VoucherWeekend, voucherWeekendDateRules)
    val voucherEveryDayDateRules = StartDateRules(Some(mondayRule), Some(voucherWindowRule))
    val voucherEveryDay = Plan(VoucherEveryDay, voucherEveryDayDateRules)
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
  val all = List(MonthlyContribution) //we only support monthly contribution for now..
  def fromName(name: String): Option[PlanId] = all.find(_.name == name)
}

case class Plan(id: PlanId, startDateRules: StartDateRules = StartDateRules())

case class DelayDays(value: Int) extends AnyVal
case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule
