package com.gu.zuora.reports.dataModel

import play.api.libs.json.Json

case class Batch(fileId: String, name: String)

object Batch {
  implicit val reads = Json.reads[Batch]
  implicit val writes = Json.writes[Batch]
}
