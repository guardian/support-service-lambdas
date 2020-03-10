package com.gu.zuora

import play.api.libs.json.{Json, Reads}

case class Oauth(clientId: String, clientSecret: String)

object Oauth {
  implicit val reads: Reads[Oauth] = Json.reads[Oauth]
}

case class HolidayStopProcessor(oauth: Oauth)

object HolidayStopProcessor {
  implicit val reads: Reads[HolidayStopProcessor] = Json.reads[HolidayStopProcessor]
}

object HolidayStopProcessorZuoraConfig {
  implicit val reads: Reads[HolidayStopProcessorZuoraConfig] = Json.reads[HolidayStopProcessorZuoraConfig]
}

trait ZuoraConfigBase {
  def baseUrl: String
}

case class HolidayStopProcessorZuoraConfig(
  baseUrl: String,
  holidayStopProcessor: HolidayStopProcessor
) extends ZuoraConfigBase

case class ZuoraRestOauthConfig(
  baseUrl: String,
  oauth: Oauth
) extends ZuoraConfigBase

