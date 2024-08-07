package com.gu.newproduct.api.productcatalog

import com.gu.i18n.Currency.GBP
import com.gu.i18n.{Country, CountryGroup, Currency}
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.GuardianWeeklyAddressValidator
import play.api.libs.json.{JsString, Json, OWrites, Writes}

import java.time.{DayOfWeek, LocalDate}

object WireModel {

  sealed trait WireDayOfWeek

  case object Monday extends WireDayOfWeek

  case object Tuesday extends WireDayOfWeek

  case object Wednesday extends WireDayOfWeek

  case object Thursday extends WireDayOfWeek

  case object Friday extends WireDayOfWeek

  case object Saturday extends WireDayOfWeek

  case object Sunday extends WireDayOfWeek

  sealed trait WireBillingPeriod
  case object Monthly extends WireBillingPeriod
  case object Quarterly extends WireBillingPeriod
  case object Annual extends WireBillingPeriod
  case object SixWeeks extends WireBillingPeriod

  case class WirePlanInfo(
      id: String,
      label: String,
      startDateRules: WireStartDateRules,
      paymentPlans: List[WirePaymentPlan],
      paymentPlan: Option[String], // todo legacy field, remove once salesforce is reading from paymentPlans
  )

  case class WirePaymentPlan(
      currencyCode: String,
      amount: BigDecimal,
      billingPeriod: WireBillingPeriod,
      description: String,
  )
  object WirePaymentPlan {
    implicit val writes: OWrites[WirePaymentPlan] = Json.writes[WirePaymentPlan]

  }

  case class WireSelectableWindow(
      startDate: LocalDate,
      sizeInDays: Option[Int] = None,
  )

  case class WireStartDateRules(
      daysOfWeek: List[WireDayOfWeek],
      selectableWindow: WireSelectableWindow,
  )

  case class WireProduct(
      label: String,
      plans: List[WirePlanInfo],
      enabledForDeliveryCountries: Option[List[String]],
  )

  case class WireCatalog(products: List[WireProduct])

  object WireDayOfWeek {
    implicit val writes: Writes[WireDayOfWeek] = { (day: WireDayOfWeek) => JsString(day.toString) }

    def fromDayOfWeek(day: DayOfWeek) = day match {
      case DayOfWeek.MONDAY => Monday
      case DayOfWeek.TUESDAY => Tuesday
      case DayOfWeek.WEDNESDAY => Wednesday
      case DayOfWeek.THURSDAY => Thursday
      case DayOfWeek.FRIDAY => Friday
      case DayOfWeek.SATURDAY => Saturday
      case DayOfWeek.SUNDAY => Sunday
    }
  }

  object WireBillingPeriod {
    implicit val writes: Writes[WireBillingPeriod] = { (period: WireBillingPeriod) => JsString(period.toString) }
    def fromBillingPeriod(billingPeriod: BillingPeriod) = billingPeriod match {
      case com.gu.newproduct.api.productcatalog.Monthly => Monthly
      case com.gu.newproduct.api.productcatalog.Quarterly => Quarterly
      case com.gu.newproduct.api.productcatalog.Annual => Annual
      case com.gu.newproduct.api.productcatalog.SixWeeks => SixWeeks
    }
  }

  object WireSelectableWindow {
    implicit val writes: OWrites[WireSelectableWindow] = Json.writes[WireSelectableWindow]

    def fromWindowRule(rule: WindowRule) = {
      WireSelectableWindow(rule.startDate, rule.maybeSize.map(_.value))
    }
  }

  object WireStartDateRules {
    implicit val writes: OWrites[WireStartDateRules] = Json.writes[WireStartDateRules]

    def fromStartDateRules(rule: StartDateRules): WireStartDateRules = {
      val allowedDays = rule.daysOfWeekRule.map(_.allowedDays) getOrElse DayOfWeek.values.toList
      val wireAllowedDaysOfWeek = allowedDays.map(WireDayOfWeek.fromDayOfWeek)
      WireStartDateRules(wireAllowedDaysOfWeek, WireSelectableWindow.fromWindowRule(rule.windowRule))
    }
  }

  object WirePlanInfo {
    implicit val writes: OWrites[WirePlanInfo] = Json.writes[WirePlanInfo]

    def toWireRules(startDateRules: StartDateRules): WireStartDateRules =
      WireStartDateRules.fromStartDateRules(startDateRules)

    def fromPlan(plan: Plan) = {

      val paymentPlans = plan.paymentPlans.map { case (currency: Currency, paymentPlan: PaymentPlan) =>
        WirePaymentPlan(
          currency.iso,
          paymentPlan.amountMinorUnits.value / 100d,
          WireBillingPeriod.fromBillingPeriod(paymentPlan.billingPeriod),
          paymentPlan.description,
        )
      }

      val legacyPaymentPlan = plan.paymentPlans.get(GBP).map(_.description)

      WirePlanInfo(
        id = plan.id.name,
        label = plan.description.value,
        startDateRules = toWireRules(plan.startDateRules),
        paymentPlans = paymentPlans.toList,
        paymentPlan = legacyPaymentPlan,
      )
    }
  }

  object WireProduct {
    implicit val writes: OWrites[WireProduct] = Json.writes[WireProduct]
  }

  object WireCatalog {
    implicit val writes: OWrites[WireCatalog] = Json.writes[WireCatalog]

    def fromCatalog(catalog: Map[PlanId, Plan]) = {

      def wirePlanForPlanId(planId: PlanId): WirePlanInfo = {
        val plan = catalog(planId)
        WirePlanInfo.fromPlan(plan)
      }

      val voucherProduct = WireProduct(
        label = "Voucher",
        plans = PlanId.enabledVoucherPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
      )

      val supporterPlusProduct = WireProduct(
        label = "Supporter Plus",
        plans = PlanId.enabledSupporterPlusPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
      )

      val contributionProduct = WireProduct(
        label = "Contribution",
        plans = PlanId.enabledContributionPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
      )

      val homeDeliveryProduct = WireProduct(
        label = "Home Delivery",
        plans = PlanId.enabledHomeDeliveryPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
      )

      val digipackProduct = WireProduct(
        label = "Digital Pack",
        plans = PlanId.enabledDigipackPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
      )

      val guardianWeeklyDomestic = WireProduct(
        label = "Guardian Weekly - Domestic",
        plans = PlanId.enabledGuardianWeeklyDomesticPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(GuardianWeeklyAddressValidator.domesticCountries.map(_.name)),
      )

      val guardianWeeklyROW = WireProduct(
        label = "Guardian Weekly - ROW",
        plans = PlanId.enabledGuardianWeeklyROWPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(CountryGroup.RestOfTheWorld.countries.map(_.name)),
      )

      val digitalVoucher = WireProduct(
        label = "Subscription Card",
        plans = PlanId.enabledDigitalVoucherPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(List(Country.UK.name)),
      )

      val nationalDelivery = WireProduct(
        label = "National Delivery",
        plans = PlanId.enabledNationalDeliveryPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(List(Country.UK.name)),
      )

      val tierThree = WireProduct(
        label = "Tier Three",
        plans = PlanId.enabledTierThreePlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(List(Country.UK.name)),
      )

      val availableProductsAndPlans = {
        val unfiltered = List(
          supporterPlusProduct,
          contributionProduct,
          voucherProduct,
          homeDeliveryProduct,
          digipackProduct,
          guardianWeeklyDomestic,
          guardianWeeklyROW,
          digitalVoucher,
          nationalDelivery,
          tierThree,
        )
        unfiltered.filter(_.plans.nonEmpty)
      }

      WireCatalog(availableProductsAndPlans)
    }
  }
}
