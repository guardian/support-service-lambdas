package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.PrefixedTokens
import play.api.libs.json.{Json, Reads}

case class EmergencyTokensConfig(val prefix: String, secret: String)

object EmergencyTokensConfig {
  implicit val EmergencyTokensConfigReads: Reads[EmergencyTokensConfig] = Json.reads[EmergencyTokensConfig]
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
