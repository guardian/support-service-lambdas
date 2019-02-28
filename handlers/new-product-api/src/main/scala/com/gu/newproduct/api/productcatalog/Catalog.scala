package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
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
  homeDeliverySaturdayPlus: Plan
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
    homeDeliverySaturdayPlus
  )

  val planForId: Map[PlanId, Plan] = allPlans.map(x => x.id -> x).toMap
}
sealed trait VoucherPlanId
sealed trait ContributionPlanId
sealed trait HomeDeliveryPlanId
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
  val enabledHomeDeliveryPlans = List.empty

  val supportedPlans: List[PlanId] = enabledVoucherPlans ++ enabledContributionPlans ++ enabledHomeDeliveryPlans
  def fromName(name: String): Option[PlanId] = supportedPlans.find(_.name == name)
}

case class Plan(id: PlanId, description: PlanDescription, startDateRules: StartDateRules = StartDateRules(), paymentPlan: Option[PaymentPlan] = None)

case class PaymentPlan(value: String) extends AnyVal

case class PlanDescription(value: String) extends AnyVal

case class DelayDays(value: Int) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: DaysOfWeekRule = DaysOfWeekRule(DayOfWeek.values.toList), windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule

case class AmountMinorUnits(value: Int) extends AnyVal

