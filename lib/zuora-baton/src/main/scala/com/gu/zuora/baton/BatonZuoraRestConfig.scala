package com.gu.zuora.baton

import com.gu.util.config.ConfigLocation
import com.gu.util.zuora.ZuoraOAuthConfig
import play.api.libs.json.Json

case class BatonZuoraConfig(oauth: ZuoraOAuthConfig)

case class BatonZuoraRestConfig(
    baseUrl: String,
    batonZuora: BatonZuoraConfig,
)

object BatonZuoraRestConfig {
  implicit val configReads = Json.reads[BatonZuoraConfig]
  implicit val restConfigReads = Json.reads[BatonZuoraRestConfig]
  implicit val location = ConfigLocation[BatonZuoraRestConfig](path = "zuoraRest", version = 1)
}
