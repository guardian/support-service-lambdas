package com.gu.salesforce.sttp

import java.time.Instant
import java.time.format.DateTimeFormatter
import io.circe.java8.time._
import io.circe.Decoder

object SalesforceCirceImplicits {
  implicit val salesforceInstantDecoder: Decoder[Instant] =
    decodeOffsetDateTimeWithFormatter(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ"))
      .map(_.toInstant)
}
