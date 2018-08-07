package scala.com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.newproduct.api.addsubscription.validation._

case class Catalog(
  voucherWeekend: Plan,
  voucherEveryDay: Plan,
  monthlyContribution: Plan
)

object Catalog {
  def apply(getCurrentDate: () => LocalDate): Catalog = {
    val voucherWindowRule = WindowRule(
      now = getCurrentDate,
      cutOffDay = Some(DayOfWeek.TUESDAY),
      startDelay = Some(Days(20)),
      size = Some(Days(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val mondayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekednDateRules = CompositeRule(List(voucherWindowRule, weekendRule))
    val voucherWeekend = Plan(PlanId("voucher_weekend"), Some(voucherWeekednDateRules))
    val voucherEveryDayDateRules = CompositeRule(List(voucherWindowRule, mondayRule))
    val voucherEveryDay = Plan(PlanId("voucher_everyDay"), Some(voucherEveryDayDateRules))
    val monthlyContributionwindow = WindowRule(
      now = getCurrentDate,
      size = Some(Days(1)),
      cutOffDay = None,
      startDelay = None
    )
    val monthlyContribution = Plan(PlanId("monthly_contribution"), Some(monthlyContributionwindow))

    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}
case class PlanId(value: String) extends AnyVal
case class Plan(id: PlanId, startDateRule: Option[DateRule])
