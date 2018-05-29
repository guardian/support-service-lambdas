package com.gu.util.zuora.aqua

import play.api.libs.json._
//probably will have to add the info needed to get file once the query is done
case class Batch(status: String, name: String)

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

