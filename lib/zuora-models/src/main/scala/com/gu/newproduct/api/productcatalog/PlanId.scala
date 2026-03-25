package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

import com.gu.i18n.Currency

sealed trait VoucherPlanId
sealed trait SupporterPlusPlanId
sealed trait ContributionPlanId
sealed trait HomeDeliveryPlanId
sealed trait DigipackPlanId
sealed trait GuardianWeeklyPlusDomestic
sealed trait GuardianWeeklyPlusRow
sealed trait DigitalVoucherPlanId
sealed trait NationalDeliveryPlanId

sealed abstract class PlanId(val name: String)

object PlanId {
  case object AnnualSupporterPlus extends PlanId("annual_supporter_plus") with SupporterPlusPlanId

  case object MonthlySupporterPlus extends PlanId("monthly_supporter_plus") with SupporterPlusPlanId

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

  case object HomeDeliveryEveryDay extends PlanId("home_delivery_everyday") with HomeDeliveryPlanId

  case object HomeDeliverySixDay extends PlanId("home_delivery_sixday") with HomeDeliveryPlanId

  case object HomeDeliveryWeekend extends PlanId("home_delivery_weekend") with HomeDeliveryPlanId

  case object HomeDeliverySunday extends PlanId("home_delivery_sunday") with HomeDeliveryPlanId

  case object HomeDeliveryEveryDayPlus extends PlanId("home_delivery_everyday_plus") with HomeDeliveryPlanId

  case object HomeDeliverySixDayPlus extends PlanId("home_delivery_sixday_plus") with HomeDeliveryPlanId

  case object HomeDeliveryWeekendPlus extends PlanId("home_delivery_weekend_plus") with HomeDeliveryPlanId

  case object HomeDeliverySaturday extends PlanId("home_delivery_saturday") with HomeDeliveryPlanId

  case object HomeDeliverySaturdayPlus extends PlanId("home_delivery_saturday_plus") with HomeDeliveryPlanId

  case object DigipackMonthly extends PlanId("digipack_monthly") with DigipackPlanId

  case object DigipackAnnual extends PlanId("digipack_annual") with DigipackPlanId

  case object GuardianWeeklyPlusDomesticMonthly
      extends PlanId("guardian_weekly_plus_domestic_monthly")
      with GuardianWeeklyPlusDomestic

  case object GuardianWeeklyPlusDomesticQuarterly
      extends PlanId("guardian_weekly_plus_domestic_quarterly")
      with GuardianWeeklyPlusDomestic

  case object GuardianWeeklyPlusDomesticAnnual
      extends PlanId("guardian_weekly_plus_domestic_annual")
      with GuardianWeeklyPlusDomestic

  case object GuardianWeeklyPlusROWMonthly extends PlanId("guardian_weekly_plus_row_monthly") with GuardianWeeklyPlusRow

  case object GuardianWeeklyPlusROWQuarterly
      extends PlanId("guardian_weekly_plus_row_quarterly")
      with GuardianWeeklyPlusRow

  case object GuardianWeeklyPlusROWAnnual extends PlanId("guardian_weekly_plus_row_annual") with GuardianWeeklyPlusRow

  case object DigitalVoucherWeekend extends PlanId("digital_voucher_weekend") with DigitalVoucherPlanId

  case object DigitalVoucherWeekendPlus extends PlanId("digital_voucher_weekend_plus") with DigitalVoucherPlanId

  case object DigitalVoucherEveryday extends PlanId("digital_voucher_everyday") with DigitalVoucherPlanId

  case object DigitalVoucherEverydayPlus extends PlanId("digital_voucher_everyday_plus") with DigitalVoucherPlanId

  case object DigitalVoucherSaturday extends PlanId("digital_voucher_saturday") with DigitalVoucherPlanId

  case object DigitalVoucherSaturdayPlus extends PlanId("digital_voucher_saturday_plus") with DigitalVoucherPlanId

  case object DigitalVoucherSunday extends PlanId("digital_voucher_sunday") with DigitalVoucherPlanId

  case object DigitalVoucherSixday extends PlanId("digital_voucher_sixday") with DigitalVoucherPlanId

  case object DigitalVoucherSixdayPlus extends PlanId("digital_voucher_sixday_plus") with DigitalVoucherPlanId

  case object NationalDeliveryWeekend extends PlanId("national_delivery_weekend") with NationalDeliveryPlanId

  case object NationalDeliveryWeekendPlus extends PlanId("national_delivery_weekend_plus") with NationalDeliveryPlanId

  case object NationalDeliveryEveryday extends PlanId("national_delivery_everyday") with NationalDeliveryPlanId

  case object NationalDeliveryEverydayPlus extends PlanId("national_delivery_everyday_plus") with NationalDeliveryPlanId

  case object NationalDeliverySixday extends PlanId("national_delivery_sixday") with NationalDeliveryPlanId

  case object NationalDeliverySixdayPlus extends PlanId("national_delivery_sixday_plus") with NationalDeliveryPlanId

  val enabledVoucherPlans = List(
    VoucherEveryDayPlus,
    VoucherSixDayPlus,
    VoucherWeekendPlus,
    VoucherSaturdayPlus,
    VoucherEveryDay,
    VoucherSixDay,
    VoucherWeekend,
    VoucherSaturday,
    VoucherSunday,
  )

  val enabledContributionPlans = List(
    MonthlyContribution,
    AnnualContribution,
  )

  val enabledSupporterPlusPlans = List(
    MonthlySupporterPlus,
    AnnualSupporterPlus,
  )

  val enabledHomeDeliveryPlans = List(
    HomeDeliveryEveryDayPlus,
    HomeDeliverySixDayPlus,
    HomeDeliveryWeekendPlus,
    HomeDeliverySaturdayPlus,
    HomeDeliveryEveryDay,
    HomeDeliverySixDay,
    HomeDeliveryWeekend,
    HomeDeliverySaturday,
    HomeDeliverySunday,
  )

  val enabledDigipackPlans = List(
    DigipackAnnual,
    DigipackMonthly,
  )

  val enabledGuardianWeeklyPlusDomesticPlans = List(
    GuardianWeeklyPlusDomesticMonthly,
    GuardianWeeklyPlusDomesticQuarterly,
    GuardianWeeklyPlusDomesticAnnual,
  )

  val enabledGuardianWeeklyPlusROWPlans = List(
    GuardianWeeklyPlusROWMonthly,
    GuardianWeeklyPlusROWQuarterly,
    GuardianWeeklyPlusROWAnnual,
  )

  val enabledDigitalVoucherPlans = List(
    DigitalVoucherEverydayPlus,
    DigitalVoucherSixdayPlus,
    DigitalVoucherWeekendPlus,
    DigitalVoucherSaturdayPlus,
    DigitalVoucherEveryday,
    DigitalVoucherSixday,
    DigitalVoucherWeekend,
    DigitalVoucherSaturday,
    DigitalVoucherSunday,
  )

  val enabledNationalDeliveryPlans = List(
    NationalDeliveryEverydayPlus,
    NationalDeliverySixdayPlus,
    NationalDeliveryWeekendPlus,
    NationalDeliveryEveryday,
    NationalDeliverySixday,
    NationalDeliveryWeekend,
  )

  val supportedPlans: List[PlanId] =
    enabledVoucherPlans ++ enabledSupporterPlusPlans ++ enabledContributionPlans ++ enabledHomeDeliveryPlans ++
      enabledDigipackPlans ++ enabledGuardianWeeklyPlusDomesticPlans ++ enabledGuardianWeeklyPlusROWPlans ++
      enabledDigitalVoucherPlans ++ enabledNationalDeliveryPlans

  def fromName(name: String): Option[PlanId] = supportedPlans.find(_.name == name)
}
