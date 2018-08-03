package com.gu.newproduct.api.productcatalog

import play.api.libs.json.{JsString, Json, Writes}

sealed trait DayOfWeek

case object Monday extends DayOfWeek

case object Tuesday extends DayOfWeek

case object Wednesday extends DayOfWeek

case object Thursday extends DayOfWeek

case object Friday extends DayOfWeek

case object Saturday extends DayOfWeek

case object Sunday extends DayOfWeek

case class ProductInfo(
  id: String,
  label: String,
  startDateRules: Option[StartDateRules] = None
)

case class SelectableWindowRules(
  cutOffDayInclusive: Option[DayOfWeek] = None,
  minDaysAfterCutOff: Option[Int] = None,
  sizeInDays: Option[Int] = None
)
case class StartDateRules(
  daysOfWeek: Option[List[DayOfWeek]] = None,
  selectableWindowRules: Option[SelectableWindowRules] = None
)

case class Group(label: String, products: List[ProductInfo])

case class Catalog(groups: List[Group])

object DayOfWeek {
  implicit val writes: Writes[DayOfWeek] = { (day: DayOfWeek) => JsString(day.toString) }
}

object SelectableWindowRules {
  implicit val writes = Json.writes[SelectableWindowRules]
}
object StartDateRules {
  implicit val writes = Json.writes[StartDateRules]
}
object ProductInfo {
  implicit val writes = Json.writes[ProductInfo]
}

object Group {
  implicit val writes = Json.writes[Group]
}

object Catalog {
  implicit val writes = Json.writes[Catalog]
}
