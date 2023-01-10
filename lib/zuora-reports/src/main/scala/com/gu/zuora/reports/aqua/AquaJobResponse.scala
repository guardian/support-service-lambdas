package com.gu.zuora.reports.aqua

import play.api.libs.json.Json

case class Batch(
    status: String,
    name: String,
    fileId: Option[String] = None,
)

case class AquaJobResponse(
    status: String,
    name: String,
    batches: Seq[Batch],
    id: Option[String],
)

object Batch {
  implicit val reads = Json.reads[Batch]
}

object AquaJobResponse {
  implicit val reads = Json.reads[AquaJobResponse]
}
