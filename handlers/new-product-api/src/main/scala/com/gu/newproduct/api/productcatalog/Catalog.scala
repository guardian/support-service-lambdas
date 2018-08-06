package scala.com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._
import com.gu.newproduct.api.productcatalog._

case class Catalog(
  voucherWeekend: Plan,
  voucherEveryDay: Plan,
  monthlyContribution: Plan
)

object Catalog {
  def apply(getCurrentDate: () => LocalDate) {
    val voucherWindowRule = WindowRule(
      now = getCurrentDate,
      cutOffDay = Some(DayOfWeek.TUESDAY),
      startDelay = Some(Days(20)),
      size = Some(Days(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val mondayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekend = Plan(PlanId("voucher_weekend"), List(voucherWindowRule, weekendRule))
    val voucherEveryDay = Plan(PlanId("voucher_everyDay"), List(voucherWindowRule, mondayRule))
    val monthlyContributionwindow = WindowRule(
      now = getCurrentDate,
      size = Some(Days(1)),
      cutOffDay = None,
      startDelay = None
    )
    val monthlyContribution = Plan(PlanId("monthly_contribution"), List(monthlyContributionwindow))

    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}
