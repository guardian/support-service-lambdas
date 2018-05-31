package com.gu.util.zuora

import play.api.libs.json.{JsPath, Json, Reads}

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String
)

object ZuoraRestConfig {
  implicit val zuoraConfigReads = Json.reads[ZuoraRestConfig]
}
