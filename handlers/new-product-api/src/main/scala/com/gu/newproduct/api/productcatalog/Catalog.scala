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

case class PlanInfo(
  id: String,
  label: String,
  startDateRules: Option[StartDateRules] = None
)

case class SelectableWindow(
  cutOffDayInclusive: Option[DayOfWeek] = None,
  startDaysAfterCutOff: Option[Int] = None,
  sizeInDays: Option[Int] = None
)
case class StartDateRules(
  daysOfWeek: Option[List[DayOfWeek]] = None,
  selectableWindow: Option[SelectableWindow] = None
)

case class Product(label: String, plans: List[PlanInfo])

case class Catalog(products: List[Product])

object DayOfWeek {
  implicit val writes: Writes[DayOfWeek] = { (day: DayOfWeek) => JsString(day.toString) }
}

object SelectableWindow {
  implicit val writes = Json.writes[SelectableWindow]
}
object StartDateRules {
  implicit val writes = Json.writes[StartDateRules]
}
object PlanInfo {
  implicit val writes = Json.writes[PlanInfo]
}

object Product {
  implicit val writes = Json.writes[Product]
}

object Catalog {
  implicit val writes = Json.writes[Catalog]
}
