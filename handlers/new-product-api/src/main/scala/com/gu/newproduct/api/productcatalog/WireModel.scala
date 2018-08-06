package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek

import play.api.libs.json.{JsString, Json, Writes}

import scala.com.gu.newproduct.api.productcatalog.Catalog

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
    startDateRules: Option[WireStartDateRules] = None
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
  }

  object WireStartDateRules {
    implicit val writes = Json.writes[WireStartDateRules]

    def fromDateRules(rules: List[DateRule]) = {
      val emptyRules = WireStartDateRules()
      rules.foldRight(emptyRules) { (rule: DateRule, partialRules: WireStartDateRules) =>
        rule match {
          case DaysOfWeekRule(allowedDays) => {
            val wireAllowedDays = allowedDays.map(WireDayOfWeek.fromDayOfWeek)
            partialRules.copy(daysOfWeek = Some(wireAllowedDays))
          }
          case WindowRule(_, cutOffDay, daysAfterCutOff, size) => {
            val wireCutoffDay = cutOffDay.map(WireDayOfWeek.fromDayOfWeek)
            val wireWindowRules = WireSelectableWindow(wireCutoffDay, daysAfterCutOff.map(_.value), size.map(_.value))
            partialRules.copy(selectableWindow = Some(wireWindowRules))
          }
        }
      }
    }
  }

  object WirePlanInfo {
    implicit val writes = Json.writes[WirePlanInfo]

    def fromPlan(plan: Plan, label: String) =
      WirePlanInfo(
        id = plan.id.value,
        label = label,
        startDateRules = if (plan.startDateRules.isEmpty) None
        else Some(WireStartDateRules.fromDateRules(plan.startDateRules))
      )

  }

  object WireProduct {
    implicit val writes = Json.writes[WireProduct]
  }

  object WireCatalog {
    implicit val writes = Json.writes[WireCatalog]

    def fromCatalog(catalog: Catalog) = {
      val voucherProduct = WireProduct(
        label = "Voucher",
        plans = List(
          WirePlanInfo.fromPlan(catalog.voucherWeekend, "Weekend"),
          WirePlanInfo.fromPlan(catalog.voucherEveryDay, "Every day")
        )
      )
      val contributionProduct = WireProduct(
        label = "Contribution",
        plans = List(
          WirePlanInfo.fromPlan(catalog.monthlyContribution, "Monthly")
        )
      )
      WireCatalog(List(voucherProduct, contributionProduct))
    }
  }

}
