package com.gu.salesforce

import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class SFAuthConfig(
    url: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
    token: String,
)

object SFAuthConfig {
  implicit val reads: Reads[SFAuthConfig] = Json.reads[SFAuthConfig]
  implicit val location: ConfigLocation[SFAuthConfig] = ConfigLocation[SFAuthConfig](path = "sfAuth", version = 1)
}

object SFExportAuthConfig {
  val location = ConfigLocation[SFAuthConfig](path = "sfExportAuth", version = 1)
}
