package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek

import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import play.api.libs.json.{JsString, Json, Writes}
import com.gu.newproduct.api.addsubscription.Formatters._
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
    paymentPlan: Option[String] = None
  )

  case class WireSelectableWindow(
    cutOffDayInclusive: Option[WireDayOfWeek] = None,
    startDaysAfterCutOff: Option[Int] = None,
    sizeInDays: Option[Int] = None
  )

  case class WireStartDateRules(
    daysOfWeek: Option[List[WireDayOfWeek]] = None,
    selectableWindow: Option[WireSelectableWindow] = None
  )

  case class WireProduct(label: String, plans: List[WirePlanInfo])

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
      val maybeWireAllowedDaysOfWeek = rule.daysOfWeekRule.map(_.allowedDays.map(WireDayOfWeek.fromDayOfWeek))
      val maybeWireWindowRules = rule.windowRule.map(WireSelectableWindow.fromWindowRule(_))
      WireStartDateRules(maybeWireAllowedDaysOfWeek, maybeWireWindowRules)
    }
  }
  object WirePlanInfo {
    implicit val writes = Json.writes[WirePlanInfo]

    def toOptionalWireRules(startDateRules: StartDateRules): Option[WireStartDateRules] =
      if (startDateRules == StartDateRules()) None else Some(WireStartDateRules.fromStartDateRules(startDateRules))

    def fromPlan(plan: Plan, label: String, priceFor: PlanId => Option[AmountMinorUnits]) = {
      val paymentDescription = priceFor(plan.id).map(amount => s"GBP ${amount.formatted} every month")
      WirePlanInfo(
        id = plan.id.name,
        label = label,
        startDateRules = toOptionalWireRules(plan.startDateRules),
        paymentPlan = paymentDescription
      )
    }
  }

  object WireProduct {
    implicit val writes = Json.writes[WireProduct]
  }

  object WireCatalog {
    implicit val writes = Json.writes[WireCatalog]

    def fromCatalog(catalog: Catalog, priceFor: PlanId => Option[AmountMinorUnits]) = {
      val toWirePlan: (Plan, String) => WirePlanInfo = WirePlanInfo.fromPlan(_, _, priceFor)
      val voucherProduct = WireProduct(
        label = "Voucher",
        plans = List(
          toWirePlan(catalog.voucherEveryDay, "Every day"),
          toWirePlan(catalog.voucherEveryDayPlus, "Every day+"),
          toWirePlan(catalog.voucherSaturday, "Saturday"),
          toWirePlan(catalog.voucherSaturdayPlus, "Saturday+"),
          toWirePlan(catalog.voucherSixDay, "Six day"),
          toWirePlan(catalog.voucherSixDayPlus, "Six day+"),
          toWirePlan(catalog.voucherSunday, "Sunday"),
          toWirePlan(catalog.voucherSundayPlus, "Sunday+"),
          toWirePlan(catalog.voucherWeekend, "Weekend"),
          toWirePlan(catalog.voucherWeekendPlus, "Weekend+")
        )
      )
      val contributionProduct = WireProduct(
        label = "Contribution",
        plans = List(
          toWirePlan(catalog.monthlyContribution, "Monthly")
        )
      )
      WireCatalog(List(contributionProduct, voucherProduct))
    }
  }

}
