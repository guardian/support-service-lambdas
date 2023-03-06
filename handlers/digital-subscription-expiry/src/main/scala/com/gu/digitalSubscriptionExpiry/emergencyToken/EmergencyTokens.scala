package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.PrefixedTokens
import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class EmergencyTokensConfig(val prefix: String, secret: String)

object EmergencyTokensConfig {
  implicit val EmergencyTokensConfigReads: Reads[EmergencyTokensConfig] = Json.reads[EmergencyTokensConfig]
  implicit val location = ConfigLocation[EmergencyTokensConfig](path = "emergencyTokens", version = 1)
}
case class EmergencyTokens(prefix: String, codec: PrefixedTokens)
object EmergencyTokens {
  def apply(emergencyTokensConfig: EmergencyTokensConfig): EmergencyTokens = {
    val codec = PrefixedTokens(
      secretKey = emergencyTokensConfig.secret,
      emergencySubscriberAuthPrefix = emergencyTokensConfig.prefix,
    )
    EmergencyTokens(emergencyTokensConfig.prefix, codec)
  }
}
