package com.gu.util.zuora

import com.gu.util.config.SecretLocation
import play.api.libs.json.{Json, Reads}

case class ZuoraOAuthConfig(clientId: String, clientSecret: String)

object ZuoraOAuthConfig {
  implicit val location: SecretLocation[ZuoraOAuthConfig] = SecretLocation("Zuora-OAuth/SupportServiceLambdas")
  implicit val reads: Reads[ZuoraOAuthConfig] = Json.reads[ZuoraOAuthConfig]

  def serverUrl(stage: String): String = stage match {
    case "PROD" => "https://rest.zuora.com"
    case "CSBX" => "https://rest.test.zuora.com"
    case _ => "https://rest.apisandbox.zuora.com"
  }
}
