package com.gu.salesforce.sttp

import java.time.Instant
import java.time.format.DateTimeFormatter
import io.circe.Decoder
import scala.util.Try

// FIXME: Why is this necessary? This seems to be used only by SalesforceClientTest
// FIXME: Custom codec might not be necessary after migration to circe 0.12.0-M3 https://github.com/circe/circe/issues/1171
object SalesforceCirceImplicits {
  implicit val salesforceInstantDecoder: Decoder[Instant] =
    Decoder.decodeString.emapTry { str => Try(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ").parse(str, Instant.from(_))) }
}
