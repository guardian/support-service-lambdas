package com.gu.google

import com.gu.util.config.ConfigLocation
import play.api.libs.json.{JsObject, Json}

case class BigQueryConfig(bigQueryCredentials: JsObject)

object BigQueryConfig {
  implicit val bigQueryConfigReads = Json.reads[BigQueryConfig]
  implicit val location = ConfigLocation[BigQueryConfig](path = "bigQuery", version = 1)
}
