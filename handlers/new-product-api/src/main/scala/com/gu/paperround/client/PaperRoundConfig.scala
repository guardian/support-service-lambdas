package com.gu.paperround.client

import com.gu.paperround.client.PaperRoundConfig.ApiKey
import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class PaperRoundConfig(
  apiKey: ApiKey,
  url: String,
)

object PaperRoundConfig {

  implicit val apiKeyReads: Reads[ApiKey] = implicitly[Reads[String]].map(ApiKey.apply)

  case class ApiKey(value: String) extends AnyVal

  implicit val configReads: Reads[PaperRoundConfig] = Json.reads
  implicit val location: ConfigLocation[PaperRoundConfig] =
    ConfigLocation[PaperRoundConfig](path = "paperround", version = 1)

}
