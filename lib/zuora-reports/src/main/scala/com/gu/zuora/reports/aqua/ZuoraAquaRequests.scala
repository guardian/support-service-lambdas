package com.gu.zuora.reports.aqua

import play.api.libs.json.Json

case class AquaQuery(name: String, query: String, `type`: String = "zoqlexport")

case class AquaQueryRequest(
    format: String = "csv",
    version: String = "1.0",
    name: String,
    encrypted: String = "none",
    useQueryLabels: String = "true",
    dateTimeUtc: String = "true",
    queries: Seq[AquaQuery],
)

object AquaQuery {
  implicit val writer = Json.writes[AquaQuery]

}

object AquaQueryRequest {
  implicit val writer = Json.writes[AquaQueryRequest]
}
