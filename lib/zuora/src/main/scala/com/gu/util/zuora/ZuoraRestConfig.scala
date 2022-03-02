package com.gu.util.zuora

import com.gu.util.config.ConfigLocation
import play.api.libs.json.Json

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String,
  apiMinorVersion: Option[String] = None,
)

object ZuoraRestConfig {
  implicit val zuoraConfigReads = Json.reads[ZuoraRestConfig]
  implicit val location = ConfigLocation[ZuoraRestConfig](path = "zuoraRest", version = 1)
}
