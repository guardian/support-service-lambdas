package scala.com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.newproduct.api.addsubscription.validation
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
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(Days(20)),
      maybeSize = Some(Days(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val mondayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekednDateRules = StartDateRules(Some(weekendRule), Some(voucherWindowRule))
    val voucherWeekend = Plan(PlanId("voucher_weekend"), voucherWeekednDateRules)
    val voucherEveryDayDateRules = validation.StartDateRules(Some(mondayRule), Some(voucherWindowRule))
    val voucherEveryDay = Plan(PlanId("voucher_everyDay"), voucherEveryDayDateRules)
    val monthlyContributionWindow = WindowRule(
      now = getCurrentDate,
      maybeSize = Some(Days(1)),
      maybeCutOffDay = None,
      maybeStartDelay = None
    )
    val monthlyContributionRules = StartDateRules(windowRule = Some(monthlyContributionWindow))
    val monthlyContribution = Plan(PlanId("monthly_contribution"), monthlyContributionRules)
    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}
case class PlanId(value: String) extends AnyVal
case class Plan(id: PlanId, startDateRules: StartDateRules = StartDateRules())
