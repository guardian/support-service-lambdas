package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.productcatalog.PlanId._



object NewProductApi {
  def catalog(
    pricingFor: PlanId => Map[Currency, AmountMinorUnits],
    getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate,
    today: LocalDate
  ): Catalog = {

    def paymentPlansFor(planId: PlanId, billingPeriod: BillingPeriod): Map[Currency, PaymentPlan] = {
      val pricesByCurrency: Map[Currency, AmountMinorUnits] = pricingFor(planId)

      val billingPeriodDescription = billingPeriod match {
        case Monthly => "every month"
        case Quarterly => "every 3 months"
        case Annual => "every 12 months"
        case SixWeeks => "for the first six weeks"
      }
      pricesByCurrency.map { case (currency, amount) => (currency, PaymentPlan(
        currency = currency,
        amountMinorUnits = amount,
        billingPeriod = billingPeriod,
        description = s"${currency.iso} ${amount.formatted} $billingPeriodDescription"
      )
      )
      }
    }

    def voucherWindowRule(issueDays: List[DayOfWeek]) = WindowRule(
      startDate =  getStartDateFromFulfilmentFiles(ProductType.NewspaperVoucherBook, issueDays),
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(35))
    )

    def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
      Some(DaysOfWeekRule(allowedDays)),
      Some(voucherWindowRule(allowedDays))
    )

    val voucherMondayRules = voucherDateRules(List(MONDAY))
    val voucherSundayDateRules = voucherDateRules(List(SUNDAY))
    val voucherSaturdayDateRules = voucherDateRules(List(SATURDAY))

    def homeDeliveryWindowRule(issueDays: List[DayOfWeek]) = WindowRule(
      startDate =  getStartDateFromFulfilmentFiles(ProductType.NewspaperHomeDelivery, issueDays),
      maybeCutOffDay = None,
      maybeStartDelay = Some(DelayDays(3)),
      maybeSize = Some(WindowSizeDays(28))
    )

    def homeDeliveryDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
      Some(DaysOfWeekRule(allowedDays)),
      Some(homeDeliveryWindowRule(allowedDays))
    )

    val homeDeliveryEveryDayRules = homeDeliveryDateRules(
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY)
    )
    val weekDays = List(
      MONDAY,
      TUESDAY,
      WEDNESDAY,
      THURSDAY,
      FRIDAY
    )

    val homeDeliverySixDayRules = homeDeliveryDateRules(weekDays ++ List(SATURDAY))
    val homeDeliverySundayDateRules = homeDeliveryDateRules(List(SUNDAY))
    val homeDeliverySaturdayDateRules = homeDeliveryDateRules(List(SATURDAY))
    val homeDeliveryWeekendRules = homeDeliveryDateRules(List(SATURDAY, SUNDAY))

    val todayOnlyRule = StartDateRules(
      windowRule = Some(WindowRule(
        startDate = today,
        maybeSize = Some(WindowSizeDays(1)),
        maybeCutOffDay = None,
        maybeStartDelay = None
      ))
    )

    val windowOf90daysStartingIn2Weeks =  WindowRule(
      startDate = today.plusDays(14),
      maybeCutOffDay = None,
      maybeStartDelay = Some(DelayDays(14)),
      maybeSize = Some(WindowSizeDays(90))
    )

    val digipackStartRules = StartDateRules(
      windowRule = Some(windowOf90daysStartingIn2Weeks)
    )

    def planWithPayment(
      planId: PlanId,
      planDescription: PlanDescription,
      startDateRules: StartDateRules,
      billingPeriod: BillingPeriod
    ) = Plan(planId, planDescription, startDateRules, paymentPlansFor(planId, billingPeriod))

    val guardianWeeklyIssueDays = List(DayOfWeek.FRIDAY)
    val guardianWeeklyStartDateRules =
      StartDateRules(
        daysOfWeekRule = Some(DaysOfWeekRule(guardianWeeklyIssueDays)),
        windowRule = Some(WindowRule(
          startDate =      getStartDateFromFulfilmentFiles(ProductType.GuardianWeekly, guardianWeeklyIssueDays),
          maybeCutOffDay = Some(DayOfWeek.WEDNESDAY),
          maybeStartDelay = Some(DelayDays(7)),
          maybeSize = Some(WindowSizeDays(28))
        ))
      )


    Catalog(
      voucherWeekendPlus = planWithPayment(VoucherWeekendPlus, PlanDescription("Weekend+"), voucherSaturdayDateRules, Monthly),
      voucherWeekend = planWithPayment(VoucherWeekend, PlanDescription("Weekend"), voucherSaturdayDateRules, Monthly),
      voucherSixDay = planWithPayment(VoucherSixDay, PlanDescription("Sixday"), voucherMondayRules, Monthly),
      voucherSixDayPlus = planWithPayment(VoucherSixDayPlus, PlanDescription("Sixday+"), voucherMondayRules, Monthly),
      voucherEveryDay = planWithPayment(VoucherEveryDay, PlanDescription("Everyday"), voucherMondayRules, Monthly),
      voucherEveryDayPlus = planWithPayment(VoucherEveryDayPlus, PlanDescription("Everyday+"), voucherMondayRules, Monthly),
      voucherSaturday = planWithPayment(VoucherSaturday, PlanDescription("Saturday"), voucherSaturdayDateRules, Monthly),
      voucherSaturdayPlus = planWithPayment(VoucherSaturdayPlus, PlanDescription("Saturday+"), voucherSaturdayDateRules, Monthly),
      voucherSunday = planWithPayment(VoucherSunday, PlanDescription("Sunday"), voucherSundayDateRules, Monthly),
      voucherSundayPlus = planWithPayment(VoucherSundayPlus, PlanDescription("Sunday+"), voucherSundayDateRules, Monthly),
      monthlyContribution = planWithPayment(MonthlyContribution, PlanDescription("Monthly"), todayOnlyRule, Monthly),
      annualContribution = planWithPayment(AnnualContribution, PlanDescription("Annual"), todayOnlyRule, Monthly),
      homeDeliveryEveryDay = planWithPayment(HomeDeliveryEveryDay, PlanDescription("Everyday"), homeDeliveryEveryDayRules, Monthly),
      homeDeliverySaturday = planWithPayment(HomeDeliverySaturday, PlanDescription("Saturday"), homeDeliverySaturdayDateRules, Monthly),
      homeDeliverySunday = planWithPayment(HomeDeliverySunday, PlanDescription("Sunday"), homeDeliverySundayDateRules, Monthly),
      homeDeliverySixDay = planWithPayment(HomeDeliverySixDay, PlanDescription("Sixday"), homeDeliverySixDayRules, Monthly),
      homeDeliveryWeekend = planWithPayment(HomeDeliveryWeekend, PlanDescription("Weekend"), homeDeliveryWeekendRules, Monthly),
      homeDeliveryEveryDayPlus = planWithPayment(HomeDeliveryEveryDayPlus, PlanDescription("Everyday+"), homeDeliveryEveryDayRules, Monthly),
      homeDeliverySaturdayPlus = planWithPayment(HomeDeliverySaturdayPlus, PlanDescription("Saturday+"), homeDeliverySaturdayDateRules, Monthly),
      homeDeliverySundayPlus = planWithPayment(HomeDeliverySundayPlus, PlanDescription("Sunday+"), homeDeliverySundayDateRules, Monthly),
      homeDeliverySixDayPlus = planWithPayment(HomeDeliverySixDayPlus, PlanDescription("Sixday+"), homeDeliverySixDayRules, Monthly),
      homeDeliveryWeekendPlus = planWithPayment(HomeDeliveryWeekendPlus, PlanDescription("Weekend+"), homeDeliveryWeekendRules, Monthly),
      digipackAnnual = planWithPayment(DigipackAnnual, PlanDescription("Annual"), digipackStartRules, Annual),
      digipackMonthly = planWithPayment(DigipackMonthly, PlanDescription("Monthly"), digipackStartRules, Monthly),
      guardianWeeklyDomesticSixForSix = planWithPayment(GuardianWeeklyDomestic6for6, PlanDescription("GW Oct 18 - Six for Six - Domestic"), guardianWeeklyStartDateRules, SixWeeks),
      guardianWeeklyDomesticQuarterly = planWithPayment(GuardianWeeklyDomesticQuarterly, PlanDescription("GW Oct 18 - Quarterly - Domestic"), guardianWeeklyStartDateRules, Quarterly),
      guardianWeeklyDomesticAnnual = planWithPayment(GuardianWeeklyDomesticAnnual, PlanDescription("GW Oct 18 - Annual - Domestic"), guardianWeeklyStartDateRules, Annual),
      guardianWeeklyROWSixForSix = planWithPayment(GuardianWeeklyROW6for6, PlanDescription("GW Oct 18 - Six for Six - ROW"), guardianWeeklyStartDateRules, SixWeeks),
      guardianWeeklyROWQuarterly = planWithPayment(GuardianWeeklyROWQuarterly, PlanDescription("GW Oct 18 - Quarterly - ROW"), guardianWeeklyStartDateRules, Quarterly),
      guardianWeeklyROWAnnual = planWithPayment(GuardianWeeklyROWAnnual, PlanDescription("GW Oct 18 - Annual - ROW"), guardianWeeklyStartDateRules, Annual),
    )
  }

}
