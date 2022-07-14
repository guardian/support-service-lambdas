package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

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
  digitalVoucherWeekend: Plan,
  digitalVoucherWeekendPlus: Plan,
  digitalVoucherEveryday: Plan,
  digitalVoucherEverydayPlus: Plan,
  digitalVoucherSaturday: Plan,
  digitalVoucherSaturdayPlus: Plan,
  digitalVoucherSunday: Plan,
  digitalVoucherSundayPlus: Plan,
  digitalVoucherSixday: Plan,
  digitalVoucherSixdayPlus: Plan
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
    digipackMonthly,
    guardianWeeklyDomesticSixForSix,
    guardianWeeklyDomesticQuarterly,
    guardianWeeklyDomesticAnnual,
    guardianWeeklyROWSixForSix,
    guardianWeeklyROWQuarterly,
    guardianWeeklyROWAnnual,
    digitalVoucherWeekend,
    digitalVoucherWeekendPlus,
    digitalVoucherEveryday,
    digitalVoucherEverydayPlus,
    digitalVoucherSaturday,
    digitalVoucherSaturdayPlus,
    digitalVoucherSunday,
    digitalVoucherSundayPlus,
    digitalVoucherSixday,
    digitalVoucherSixdayPlus,
  )

  val planForId: Map[PlanId, Plan] = allPlans.map(x => x.id -> x).toMap
}
sealed trait VoucherPlanId
sealed trait ContributionPlanId
sealed trait HomeDeliveryPlanId
sealed trait DigipackPlanId
sealed trait GuardianWeeklyDomestic
sealed trait GuardianWeeklyRow
sealed trait DigitalVoucherPlanId
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

  case object DigitalVoucherWeekend extends PlanId("digital_voucher_weekend") with DigitalVoucherPlanId

  case object DigitalVoucherWeekendPlus extends PlanId("digital_voucher_weekend_plus") with DigitalVoucherPlanId

  case object DigitalVoucherEveryday extends PlanId("digital_voucher_everyday") with DigitalVoucherPlanId

  case object DigitalVoucherEverydayPlus extends PlanId("digital_voucher_everyday_plus") with DigitalVoucherPlanId

  case object DigitalVoucherSaturday extends PlanId("digital_voucher_saturday") with DigitalVoucherPlanId

  case object DigitalVoucherSaturdayPlus extends PlanId("digital_voucher_saturday_plus") with DigitalVoucherPlanId

  case object DigitalVoucherSunday extends PlanId("digital_voucher_sunday") with DigitalVoucherPlanId

  case object DigitalVoucherSundayPlus extends PlanId("digital_voucher_sunday_plus") with DigitalVoucherPlanId

  case object DigitalVoucherSixday extends PlanId("digital_voucher_sixday") with DigitalVoucherPlanId

  case object DigitalVoucherSixdayPlus extends PlanId("digital_voucher_sixday_plus") with DigitalVoucherPlanId

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

  val enabledGuardianWeeklyDomesticPlans = List(
    GuardianWeeklyDomestic6for6,
    GuardianWeeklyDomesticQuarterly,
    GuardianWeeklyDomesticAnnual,
  )

  val enabledGuardianWeeklyROWPlans = List(
    GuardianWeeklyROW6for6,
    GuardianWeeklyROWQuarterly,
    GuardianWeeklyROWAnnual
  )

  val enabledDigitalVoucherPlans = List(
    DigitalVoucherWeekend,
    DigitalVoucherWeekendPlus,
    DigitalVoucherEveryday,
    DigitalVoucherEverydayPlus,
    DigitalVoucherSaturday,
    DigitalVoucherSaturdayPlus,
    DigitalVoucherSunday,
    DigitalVoucherSundayPlus,
    DigitalVoucherSixday,
    DigitalVoucherSixdayPlus
  )

  val supportedPlans: List[PlanId] =
    enabledVoucherPlans ++ enabledContributionPlans ++ enabledHomeDeliveryPlans ++ enabledDigipackPlans ++
      enabledGuardianWeeklyDomesticPlans ++ enabledGuardianWeeklyROWPlans ++ enabledDigitalVoucherPlans

  def fromName(name: String): Option[PlanId] = supportedPlans.find(_.name == name)
}

case class Plan(id: PlanId, description: PlanDescription, startDateRules: StartDateRules, paymentPlans: Map[Currency, PaymentPlan] = Map.empty)

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

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: WindowRule)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(startDate: LocalDate, maybeSize: Option[WindowSizeDays]) extends DateRule

case class AmountMinorUnits(value: Int) extends AnyVal

/**
 * ProductType
 * Represents the ProductType field on a Product in Zuora
 */
case class ProductType(value: String)
object ProductType {
  val GuardianWeekly = ProductType("Guardian Weekly")
  val NewspaperVoucherBook = ProductType("Newspaper - Voucher Book")
  val NewspaperDigitalVoucher = ProductType("Newspaper - Digital Voucher")
  val NewspaperHomeDelivery = ProductType("Newspaper - Home Delivery")
  val DigitalPack = ProductType("Digital Pack")
  val Contribution = ProductType("Contribution")
  val Membership = ProductType("Membership")
}
