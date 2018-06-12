package com.gu.zuora.reports.dataModel

import play.api.libs.json.Json

case class FetchedFile(fileId: String, name: String, uri: String)

object FetchedFile {
  implicit val reads = Json.reads[FetchedFile]
  implicit val writes = Json.writes[FetchedFile]
}
