package com.gu.zuora.sar

import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class ZuoraSarConfig(
    resultsBucket: String,
    resultsPath: String,
    performLambdaFunctionName: String,
)

object ConfigLoader {
  def getSarLambdaConfigTemp: ZuoraSarConfig =
    ZuoraSarConfig("baton-results", "zuora-results/CODE", "performSarLambdaFunctionName")
}

object ZuoraSarConfig {
  implicit val reads: Reads[ZuoraSarConfig] = Json.reads[ZuoraSarConfig]
  implicit val location = ConfigLocation[ZuoraSarConfig](path = "zuoraSar", version = 1)
}
