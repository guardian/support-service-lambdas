package com.gu.zuora.subscription

import java.time.LocalDate

import ai.x.play.json.Jsonx
import play.api.libs.json.Format

case class AffectedPublicationDate(value: LocalDate) extends AnyVal {
  def getDayOfWeek: String = value.getDayOfWeek.toString.toLowerCase.capitalize
}

object AffectedPublicationDate {
  implicit val formatAffectedPublicationDate: Format[AffectedPublicationDate] =
    Jsonx.formatInline[AffectedPublicationDate]
}
