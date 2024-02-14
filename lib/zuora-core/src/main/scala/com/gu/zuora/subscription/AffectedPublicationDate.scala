package com.gu.zuora.subscription

import java.time.LocalDate
import play.api.libs.json.{Format, Json}

case class AffectedPublicationDate(value: LocalDate) extends AnyVal {
  def getDayOfWeek: String = value.getDayOfWeek.toString.toLowerCase.capitalize
}

object AffectedPublicationDate {
  implicit val formatAffectedPublicationDate: Format[AffectedPublicationDate] =
    Json.valueFormat[AffectedPublicationDate]
}
