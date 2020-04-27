package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

import com.gu.i18n.{CountryGroup, Currency}
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.{GuardianWeeklyAddressValidator, GuardianWeeklyDomesticAddressValidator}
import play.api.libs.json.{JsString, Json, Writes}

object WireModel {

  sealed trait WireDayOfWeek

  case object Monday extends WireDayOfWeek

  case object Tuesday extends WireDayOfWeek

  case object Wednesday extends WireDayOfWeek

  case object Thursday extends WireDayOfWeek

  case object Friday extends WireDayOfWeek

  case object Saturday extends WireDayOfWeek

  case object Sunday extends WireDayOfWeek

  case class WirePlanInfo(
    id: String,
    label: String,
    startDateRules: Option[WireStartDateRules] = None,
    paymentPlans: List[WirePaymentPlan],
    paymentPlan: Option[String] //todo legacy field, remove once salesforce is reading from paymentPlans
  )

  case class WirePaymentPlan(currencyCode: String, description: String)
  object WirePaymentPlan {
    implicit val writes = Json.writes[WirePaymentPlan]

  }

  case class WireSelectableWindow(
    cutOffDayInclusive: Option[WireDayOfWeek] = None,
    startDaysAfterCutOff: Option[Int] = None,
    sizeInDays: Option[Int] = None
  )

  case class WireStartDateRules(
    daysOfWeek: List[WireDayOfWeek],
    selectableWindow: Option[WireSelectableWindow] = None
  )

  case class WireProduct(
    label: String,
    plans: List[WirePlanInfo],
    enabledForDeliveryCountries: Option[List[String]],
    firstAvailableStartDate: LocalDate
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

  object WireSelectableWindow {
    implicit val writes = Json.writes[WireSelectableWindow]

    def fromWindowRule(rule: WindowRule) = {
      val wireCutoffDay = rule.maybeCutOffDay.map(WireDayOfWeek.fromDayOfWeek)
      WireSelectableWindow(wireCutoffDay, rule.maybeStartDelay.map(_.value), rule.maybeSize.map(_.value))
    }
  }

  object WireStartDateRules {
    implicit val writes = Json.writes[WireStartDateRules]

    def fromStartDateRules(rule: StartDateRules): WireStartDateRules = {

      val allowedDays = rule.daysOfWeekRule.map(_.allowedDays) getOrElse DayOfWeek.values.toList
      val wireAllowedDaysOfWeek = allowedDays.map(WireDayOfWeek.fromDayOfWeek)
      val maybeWireWindowRules = rule.windowRule.map(WireSelectableWindow.fromWindowRule(_))
      WireStartDateRules(wireAllowedDaysOfWeek, maybeWireWindowRules)
    }
  }

  object WirePlanInfo {
    implicit val writes = Json.writes[WirePlanInfo]

    def toOptionalWireRules(startDateRules: StartDateRules): Option[WireStartDateRules] =
      if (startDateRules == StartDateRules()) None else Some(WireStartDateRules.fromStartDateRules(startDateRules))

    def fromPlan(plan: Plan) = {

      val paymentPlans = plan.paymentPlans.map {
        case (currency: Currency, paymentPlan: PaymentPlan) => WirePaymentPlan(currency.iso, paymentPlan.description)
      }

      val legacyPaymentPlan = plan.paymentPlans.get(GBP).map(_.description)

      WirePlanInfo(
        id = plan.id.name,
        label = plan.description.value,
        startDateRules = toOptionalWireRules(plan.startDateRules),
        paymentPlans = paymentPlans.toList,
        paymentPlan = legacyPaymentPlan
      )
    }
  }

  object WireProduct {
    implicit val writes = Json.writes[WireProduct]
  }

  object WireCatalog {
    implicit val writes = Json.writes[WireCatalog]

    def fromCatalog(
      catalog: Catalog,
      getFirstAvailableStartDateFromAvailabilityCalculator: ProductType => LocalDate,
      today: LocalDate
    ) = {

      def wirePlanForPlanId(planId: PlanId): WirePlanInfo = {
        val plan = catalog.planForId(planId)
        WirePlanInfo.fromPlan(plan)
      }

      val voucherProduct = WireProduct(
        label = "Voucher",
        plans = PlanId.enabledVoucherPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
        today
      )

      val contributionProduct = WireProduct(
        label = "Contribution",
        plans = PlanId.enabledContributionPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
        today
      )

      val homeDeliveryProduct = WireProduct(
        label = "Home Delivery",
        plans = PlanId.enabledHomeDeliveryPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
        getFirstAvailableStartDateFromAvailabilityCalculator(ProductType.NewspaperHomeDelivery)
      )

      val digipackProduct = WireProduct(
        label = "Digital Pack",
        plans = PlanId.enabledDigipackPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = None,
        today.plusDays(14)
      )

      val guardianWeeklyDomestic = WireProduct(
        label = "Guardian Weekly - Domestic",
        plans = PlanId.enabledGuardianWeeklyDomesticPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(GuardianWeeklyAddressValidator.domesticCountries.map(_.name)),
        getFirstAvailableStartDateFromAvailabilityCalculator(ProductType.GuardianWeekly)
      )

      val guardianWeeklyROW = WireProduct(
        label = "Guardian Weekly - ROW",
        plans = PlanId.enabledGuardianWeeklyROWPlans.map(wirePlanForPlanId),
        enabledForDeliveryCountries = Some(CountryGroup.RestOfTheWorld.countries.map(_.name)),
        getFirstAvailableStartDateFromAvailabilityCalculator(ProductType.GuardianWeekly)
      )

      val availableProductsAndPlans = List(
        contributionProduct, voucherProduct, homeDeliveryProduct, digipackProduct, guardianWeeklyDomestic, guardianWeeklyROW
      ).filterNot(_.plans.isEmpty)

      WireCatalog(availableProductsAndPlans)
    }
  }
}
