package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek

import com.gu.i18n.Currency

case class Catalog(
  voucherWeekend: Plan,
  voucherSaturday: Plan,
  voucherSunday: Plan,
  voucherEveryDay: Plan,
  voucherSixDay: Plan,
  voucherWeekendPlus: Plan,
  voucherSaturdayPlus: Plan,
  voucherSundayPlus: Plan,
  voucherEveryDayPlus: Plan,
  voucherSixDayPlus: Plan,
  monthlyContribution: Plan,
  annualContribution: Plan,
  homeDeliveryEveryDay: Plan,
  homeDeliverySixDay: Plan,
  homeDeliveryWeekend: Plan,
  homeDeliverySunday: Plan,
  homeDeliverySaturday: Plan,
  homeDeliveryEveryDayPlus: Plan,
  homeDeliverySixDayPlus: Plan,
  homeDeliveryWeekendPlus: Plan,
  homeDeliverySundayPlus: Plan,
  homeDeliverySaturdayPlus: Plan,
  digipackAnnual: Plan,
  digipackMonthly: Plan,
  guardianWeeklyDomesticSixForSix: Plan,
  guardianWeeklyDomesticQuarterly: Plan,
  guardianWeeklyDomesticAnnual: Plan,
  guardianWeeklyROWSixForSix: Plan,
  guardianWeeklyROWQuarterly: Plan,
  guardianWeeklyROWAnnual: Plan,
) {
  val allPlans = List(
    voucherWeekend,
    voucherSaturday,
    voucherSunday,
    voucherEveryDay,
    voucherSixDay,
    voucherWeekendPlus,
    voucherSaturdayPlus,
    voucherSundayPlus,
    voucherEveryDayPlus,
    voucherSixDayPlus,
    monthlyContribution,
    annualContribution,
    homeDeliveryEveryDay,
    homeDeliverySixDay,
    homeDeliverySunday,
    homeDeliverySaturday,
    homeDeliveryWeekend,
    homeDeliveryEveryDayPlus,
    homeDeliverySixDayPlus,
    homeDeliveryWeekendPlus,
    homeDeliverySundayPlus,
    homeDeliverySaturdayPlus,
    digipackAnnual,
    digipackMonthly

  )

  val planForId: Map[PlanId, Plan] = allPlans.map(x => x.id -> x).toMap
}
sealed trait VoucherPlanId
sealed trait ContributionPlanId
sealed trait HomeDeliveryPlanId
sealed trait DigipackPlanId
sealed trait GuardianWeeklyDomestic
sealed trait GuardianWeeklyRow
sealed abstract class PlanId(val name: String)

object PlanId {
  case object AnnualContribution extends PlanId("annual_contribution") with ContributionPlanId

  case object MonthlyContribution extends PlanId("monthly_contribution") with ContributionPlanId

  case object VoucherWeekend extends PlanId("voucher_weekend") with VoucherPlanId

  case object VoucherEveryDay extends PlanId("voucher_everyday") with VoucherPlanId

  case object VoucherSixDay extends PlanId("voucher_sixday") with VoucherPlanId

  case object VoucherSaturday extends PlanId("voucher_saturday") with VoucherPlanId

  case object VoucherSunday extends PlanId("voucher_sunday") with VoucherPlanId

  case object VoucherWeekendPlus extends PlanId("voucher_weekend_plus") with VoucherPlanId

  case object VoucherEveryDayPlus extends PlanId("voucher_everyday_plus") with VoucherPlanId

  case object VoucherSixDayPlus extends PlanId("voucher_sixday_plus") with VoucherPlanId

  case object VoucherSaturdayPlus extends PlanId("voucher_saturday_plus") with VoucherPlanId

  case object VoucherSundayPlus extends PlanId("voucher_sunday_plus") with VoucherPlanId

  case object HomeDeliveryEveryDay extends PlanId("home_delivery_everyday") with HomeDeliveryPlanId

  case object HomeDeliverySixDay extends PlanId("home_delivery_sixday") with HomeDeliveryPlanId

  case object HomeDeliveryWeekend extends PlanId("home_delivery_weekend") with HomeDeliveryPlanId

  case object HomeDeliverySunday extends PlanId("home_delivery_sunday") with HomeDeliveryPlanId

  case object HomeDeliveryEveryDayPlus extends PlanId("home_delivery_everyday_plus") with HomeDeliveryPlanId

  case object HomeDeliverySixDayPlus extends PlanId("home_delivery_sixday_plus") with HomeDeliveryPlanId

  case object HomeDeliveryWeekendPlus extends PlanId("home_delivery_weekend_plus") with HomeDeliveryPlanId

  case object HomeDeliverySundayPlus extends PlanId("home_delivery_sunday_plus") with HomeDeliveryPlanId

  case object HomeDeliverySaturday extends PlanId("home_delivery_saturday") with HomeDeliveryPlanId

  case object HomeDeliverySaturdayPlus extends PlanId("home_delivery_saturday_plus") with HomeDeliveryPlanId

  case object DigipackMonthly extends PlanId("digipack_monthly") with DigipackPlanId

  case object DigipackAnnual extends PlanId("digipack_annual") with DigipackPlanId

  case object GuardianWeeklyDomestic6for6 extends PlanId("guardian_weekly_domestic_6for6") with GuardianWeeklyDomestic

  case object GuardianWeeklyDomesticQuarterly extends PlanId("guardian_weekly_domestic_quarterly") with GuardianWeeklyDomestic

  case object GuardianWeeklyDomesticAnnual extends PlanId("guardian_weekly_domestic_annual") with GuardianWeeklyDomestic

  case object GuardianWeeklyROW6for6 extends PlanId("guardian_weekly_row_6for6") with GuardianWeeklyRow

  case object GuardianWeeklyROWQuarterly extends PlanId("guardian_weekly_row_quarterly") with GuardianWeeklyRow

  case object GuardianWeeklyROWAnnual extends PlanId("guardian_weekly_row_annual") with GuardianWeeklyRow

  val enabledVoucherPlans = List(
    VoucherEveryDay,
    VoucherEveryDayPlus,
    VoucherSaturday,
    VoucherSaturdayPlus,
    VoucherSixDay,
    VoucherSixDayPlus,
    VoucherSunday,
    VoucherSundayPlus,
    VoucherWeekend,
    VoucherWeekendPlus
  )
  val enabledContributionPlans = List(
    MonthlyContribution,
    AnnualContribution
  )
  val enabledHomeDeliveryPlans = List(
    HomeDeliveryEveryDay,
    HomeDeliveryEveryDayPlus,
    HomeDeliverySaturday,
    HomeDeliverySaturdayPlus,
    HomeDeliverySixDay,
    HomeDeliverySixDayPlus,
    HomeDeliverySunday,
    HomeDeliverySundayPlus,
    HomeDeliveryWeekend,
    HomeDeliveryWeekendPlus
  )

  val enabledDigipackPlans = List(
    DigipackAnnual,
    DigipackMonthly
  )
  val supportedPlans: List[PlanId] = enabledVoucherPlans ++ enabledContributionPlans ++ enabledHomeDeliveryPlans ++ enabledDigipackPlans
  def fromName(name: String): Option[PlanId] = supportedPlans.find(_.name == name)
}

case class Plan(id: PlanId, description: PlanDescription, startDateRules: StartDateRules = StartDateRules(), paymentPlans: Map[Currency, PaymentPlan] = Map.empty)

sealed trait BillingPeriod
object Monthly extends BillingPeriod
object Quarterly extends BillingPeriod
object Annual extends BillingPeriod
object SixWeeks extends BillingPeriod

case class PaymentPlan(currency: Currency, amountMinorUnits: AmountMinorUnits, billingPeriod: BillingPeriod, description: String)

case class PlanDescription(value: String) extends AnyVal

case class DelayDays(value: Int) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule

case class AmountMinorUnits(value: Int) extends AnyVal

