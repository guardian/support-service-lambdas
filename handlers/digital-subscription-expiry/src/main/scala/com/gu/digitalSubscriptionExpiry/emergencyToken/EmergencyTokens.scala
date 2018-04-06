package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.PrefixedTokens
import play.api.libs.json.{JsPath, Reads}
import play.api.libs.functional.syntax._

case class EmergencyTokensConfig(val prefix: String, secret: String)

object EmergencyTokensConfig {
  implicit val emergencyTokensReads: Reads[EmergencyTokensConfig] = (
    (JsPath \ "emergencyTokenPrefix").read[String] and
    (JsPath \ "emergencyTokenSecret").read[String]
  )(EmergencyTokensConfig.apply _)
}
case class EmergencyTokens(prefix: String, codec: PrefixedTokens)
object EmergencyTokens {
  def apply(emergencyTokensConfig: EmergencyTokensConfig): EmergencyTokens = {
    val codec = PrefixedTokens(
      secretKey = emergencyTokensConfig.secret,
      emergencySubscriberAuthPrefix = emergencyTokensConfig.prefix
    )
    EmergencyTokens(emergencyTokensConfig.prefix, codec)
  }
}
