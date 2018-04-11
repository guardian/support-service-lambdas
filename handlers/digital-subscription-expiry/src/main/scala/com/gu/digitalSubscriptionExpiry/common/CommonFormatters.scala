package com.gu.digitalSubscriptionExpiry.common

import org.joda.time.{DateTime, LocalDate}
import play.api.libs.json.{JodaReads, JodaWrites, Reads, Writes}

object CommonFormatters {
  implicit val localDateWriter: Writes[LocalDate] = JodaWrites.jodaLocalDateWrites("yyyy-MM-dd")

  implicit val lenientDateTimeReader: Reads[DateTime] =
    JodaReads.DefaultJodaDateTimeReads orElse Reads.IsoDateReads.map(new DateTime(_))
  val dateFormat = "yyyy-MM-dd"

  implicit val localReads = JodaReads.jodaLocalDateReads(dateFormat)
}
