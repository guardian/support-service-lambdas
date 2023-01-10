package com.gu.sf_gocardless_sync.gocardless

import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class GoCardlessConfig(
    url: String,
    token: String,
    batchSize: Int,
)

object GoCardlessConfig {

  implicit val reads: Reads[GoCardlessConfig] = Json.reads[GoCardlessConfig]
  implicit val location = ConfigLocation[GoCardlessConfig](path = "goCardless", version = 1)

}
