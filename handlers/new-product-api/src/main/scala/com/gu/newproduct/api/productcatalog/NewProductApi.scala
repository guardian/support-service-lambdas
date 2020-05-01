package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.productcatalog.PlanId._



object NewProductApi {
  val DigiPackFreeTrialPeriodDays = 14
  val HomeDeliverySubscriptionStartDateWindowSize = WindowSizeDays(28)
  val GuardianWeeklySubscriptionStartDateWindowSize = WindowSizeDays(28)
  val VoucherSubscriptionStartDateWindowSize = WindowSizeDays(35)
  val ContributionStartDateWindowSize = WindowSizeDays(1)
  val DigiPackStartDateWindowSize = WindowSizeDays(90)

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

    def voucherWindowRule(issueDays: List[DayOfWeek]) = {
      WindowRule(
        startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperVoucherBook, issueDays),
        maybeSize = Some(VoucherSubscriptionStartDateWindowSize)
      )
    }

    def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
      Some(DaysOfWeekRule(allowedDays)),
      voucherWindowRule(allowedDays)
    )

    val voucherMondayRules = voucherDateRules(List(MONDAY))
    val voucherSundayDateRules = voucherDateRules(List(SUNDAY))
    val voucherSaturdayDateRules = voucherDateRules(List(SATURDAY))

    def homeDeliveryWindowRule(issueDays: List[DayOfWeek]) = WindowRule(
      startDate =  getStartDateFromFulfilmentFiles(ProductType.NewspaperHomeDelivery, issueDays),
      maybeSize = Some(HomeDeliverySubscriptionStartDateWindowSize)
    )

    def homeDeliveryDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
      Some(DaysOfWeekRule(allowedDays)),
      homeDeliveryWindowRule(allowedDays)
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

    val contributionsRule = StartDateRules(
      windowRule = WindowRule(
        startDate = today,
        maybeSize = Some(ContributionStartDateWindowSize),
      )
    )

    val digiPackWindowRule =  WindowRule(
      startDate = today.plusDays(DigiPackFreeTrialPeriodDays),
      maybeSize = Some(DigiPackStartDateWindowSize)
    )

    val digipackStartRules = StartDateRules(
      windowRule = digiPackWindowRule
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
        windowRule = WindowRule(
          startDate = getStartDateFromFulfilmentFiles(ProductType.GuardianWeekly, guardianWeeklyIssueDays),
          maybeSize = Some(GuardianWeeklySubscriptionStartDateWindowSize)
        )
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
      monthlyContribution = planWithPayment(MonthlyContribution, PlanDescription("Monthly"), contributionsRule, Monthly),
      annualContribution = planWithPayment(AnnualContribution, PlanDescription("Annual"), contributionsRule, Monthly),
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
