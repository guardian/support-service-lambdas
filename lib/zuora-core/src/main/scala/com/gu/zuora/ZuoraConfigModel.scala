package com.gu.zuora

import play.api.libs.json.{Json, Reads}

case class Oauth(clientId: String, clientSecret: String)

case class HolidayStopProcessor(oauth: Oauth)

trait ZuoraConfig {
  def baseUrl: String
}

case class HolidayStopProcessorZuoraConfig(
    baseUrl: String,
    holidayStopProcessor: HolidayStopProcessor,
) extends ZuoraConfig

case class ZuoraRestOauthConfig(
    baseUrl: String,
    oauth: Oauth,
) extends ZuoraConfig

object Oauth {
  implicit val reads: Reads[Oauth] = Json.reads[Oauth]
}

object HolidayStopProcessor {
  implicit val reads: Reads[HolidayStopProcessor] = Json.reads[HolidayStopProcessor]
}

object HolidayStopProcessorZuoraConfig {
  implicit val reads: Reads[HolidayStopProcessorZuoraConfig] = Json.reads[HolidayStopProcessorZuoraConfig]
}
