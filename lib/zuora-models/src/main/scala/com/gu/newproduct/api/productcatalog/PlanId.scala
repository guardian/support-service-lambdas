package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

import com.gu.i18n.Currency

sealed trait VoucherPlanId
sealed trait SupporterPlusPlanId
sealed trait ContributionPlanId
sealed trait HomeDeliveryPlanId
sealed trait DigipackPlanId
sealed trait GuardianWeeklyDomestic
sealed trait GuardianWeeklyRow
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
  
  case object GuardianWeeklyDomesticMonthly extends PlanId("guardian_weekly_domestic_monthly") with GuardianWeeklyDomestic

  case object GuardianWeeklyDomesticQuarterly
    extends PlanId("guardian_weekly_domestic_quarterly")
      with GuardianWeeklyDomestic
  
  case object GuardianWeeklyDomesticAnnual extends PlanId("guardian_weekly_domestic_annual") with GuardianWeeklyDomestic

  case object GuardianWeeklyROWMonthly extends PlanId("guardian_weekly_row_monthly") with GuardianWeeklyRow

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


  case object NationalDeliveryWeekend extends PlanId("national_delivery_weekend") with NationalDeliveryPlanId

  case object NationalDeliveryEveryday extends PlanId("national_delivery_everyday") with NationalDeliveryPlanId

  case object NationalDeliverySixday extends PlanId("national_delivery_sixday") with NationalDeliveryPlanId

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
    VoucherWeekendPlus,
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
    HomeDeliveryEveryDay,
    HomeDeliveryEveryDayPlus,
    HomeDeliverySaturday,
    HomeDeliverySaturdayPlus,
    HomeDeliverySixDay,
    HomeDeliverySixDayPlus,
    HomeDeliverySunday,
    HomeDeliverySundayPlus,
    HomeDeliveryWeekend,
    HomeDeliveryWeekendPlus,
  )

  val enabledDigipackPlans = List(
    DigipackAnnual,
    DigipackMonthly,
  )

  val enabledGuardianWeeklyDomesticPlans = List(
    GuardianWeeklyDomesticMonthly,
    GuardianWeeklyDomesticQuarterly,
    GuardianWeeklyDomesticAnnual,
  )

  val enabledGuardianWeeklyROWPlans = List(
    GuardianWeeklyROWMonthly,
    GuardianWeeklyROWQuarterly,
    GuardianWeeklyROWAnnual,
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
    DigitalVoucherSixdayPlus,
  )

  val enabledNationalDeliveryPlans = List(
    NationalDeliverySixday,
    NationalDeliveryEveryday,
    NationalDeliveryWeekend,
  )

  val supportedPlans: List[PlanId] =
    enabledVoucherPlans ++ enabledSupporterPlusPlans ++ enabledContributionPlans ++ enabledHomeDeliveryPlans ++ enabledDigipackPlans ++
      enabledGuardianWeeklyDomesticPlans ++ enabledGuardianWeeklyROWPlans ++ enabledDigitalVoucherPlans ++ enabledNationalDeliveryPlans

  def fromName(name: String): Option[PlanId] = supportedPlans.find(_.name == name)
}



