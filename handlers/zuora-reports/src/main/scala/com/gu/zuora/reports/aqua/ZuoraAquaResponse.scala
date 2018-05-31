package com.gu.zuora.reports.aqua

import play.api.libs.json._

case class Batch(
  status: String,
  name: String,
  fileId: Option[String] = None
)

case class ZuoraAquaResponse(
  status: String,
  name: String,
  errorCode: Option[String] = None,
  message: Option[String] = None,
  batches: Seq[Batch],
  id: Option[String]
)

object Batch {
  implicit val reads = Json.reads[Batch]
}

object ZuoraAquaResponse {
  implicit val reads = Json.reads[ZuoraAquaResponse]
}

