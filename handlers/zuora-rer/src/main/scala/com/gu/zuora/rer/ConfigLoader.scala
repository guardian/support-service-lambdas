package com.gu.zuora.rer

import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class ZuoraRerConfig(
    resultsBucket: String,
    resultsPath: String,
    performLambdaFunctionName: String,
)

object ConfigLoader {
  def getRerLambdaConfigTemp: ZuoraRerConfig =
    ZuoraRerConfig("baton-results", "zuora-results/CODE", "performRerLambdaFunctionName")
}

object ZuoraRerConfig {
  implicit val reads: Reads[ZuoraRerConfig] = Json.reads[ZuoraRerConfig]
  implicit val location = ConfigLocation[ZuoraRerConfig](path = "zuoraRer", version = 1)
}
