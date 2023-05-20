package com.gu.util.config

import com.gu.util.Logging
import play.api.libs.functional.syntax._
import play.api.libs.json._

case class StripeSecretKey(key: String) extends AnyVal

object StripeSecretKey {
  implicit val stripeSecretKeyReads = Json.reads[StripeSecretKey]
}

case class StripeWebhook(ukStripeSecretKey: StripeSecretKey, auStripeSecretKey: StripeSecretKey)

object StripeWebhook {
  implicit val stripeWebhookConfigReads: Reads[StripeWebhook] = (
    (JsPath \ "api.key.secret").read[String].map(StripeSecretKey.apply) and
      (JsPath \ "au-membership.key.secret").read[String].map(StripeSecretKey.apply)
  )(StripeWebhook.apply _)
}

case class StripeConfig(customerUpdatedWebhook: StripeWebhook, signatureChecking: Boolean)

object StripeConfig {
  implicit val location = ConfigLocation[StripeConfig](path = "stripe", version = 1)

  implicit val stripeConfigReads: Reads[StripeConfig] = (
    (JsPath \ "customerUpdatedWebhook").read[StripeWebhook] and
      (JsPath \ "signatureChecking").readNullable[String].map(!_.contains("false"))
  )(StripeConfig.apply _)
}

case class ZuoraEnvironment(value: String) extends Logging {
  // TODO: Can we get rid of this class?
  def stageToLoad: Stage = value match {
    case "PROD" => Stage("PROD")
    case "CODE" => Stage("CODE")
    case _ =>
      logger.error("Unknown Zuora environment specified, falling back to CODE")
      Stage("CODE")
  }
}
object ZuoraEnvironment extends Logging {
  def EnvForStage(stage: Stage): ZuoraEnvironment = stage match {
    case Stage("PROD") => ZuoraEnvironment("PROD")
    case Stage("CODE") => ZuoraEnvironment("CODE")
    case unknown =>
      logger.error(s"Unknown Stage specified: '$unknown', falling back to Zuora CODE env")
      ZuoraEnvironment("CODE")
  }
}

object ConfigReads {

  case class ConfigFailure(error: String) extends Throwable

}
