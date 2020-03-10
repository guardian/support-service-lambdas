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

object ZuoraConfig {
  implicit val reads: Reads[ZuoraConfig] = Json.reads[ZuoraConfig]
}

trait ZuoraConfigBase {
  def baseUrl: String
}

case class ZuoraConfig(
  baseUrl: String,
  holidayStopProcessor: HolidayStopProcessor
) extends ZuoraConfigBase

case class ZuoraRestOauthConfig(
  baseUrl: String,
  oauth: Oauth
) extends ZuoraConfigBase

