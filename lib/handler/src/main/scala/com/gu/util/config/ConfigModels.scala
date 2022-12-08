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

case class StripeConfig(customerSourceUpdatedWebhook: StripeWebhook, customerUpdatedWebhook: StripeWebhook, signatureChecking: Boolean)

object StripeConfig {
  implicit val location = ConfigLocation[StripeConfig](path = "stripe", version = 1)

  implicit val stripeConfigReads: Reads[StripeConfig] = (
    (JsPath \ "customerSourceUpdatedWebhook").read[StripeWebhook] and
    (JsPath \ "customerUpdatedWebhook").read[StripeWebhook] and
    (JsPath \ "signatureChecking").readNullable[String].map(!_.contains("false"))
  )(StripeConfig.apply _)
}

case class ZuoraEnvironment(value: String) extends Logging {

  def stageToLoad: Stage = value match {
    case "PROD" => Stage("PROD")
    case "UAT" => Stage("CODE")
    case "DEV" => Stage("DEV")
    case _ =>
      logger.error("Unknown Zuora environment specified, falling back to DEV")
      Stage("DEV")
  }
}
object ZuoraEnvironment extends Logging {
  def EnvForStage(stage: Stage): ZuoraEnvironment = stage match {
    case Stage("PROD") => ZuoraEnvironment("PROD")
    case Stage("CODE") => ZuoraEnvironment("UAT")
    case Stage("DEV") => ZuoraEnvironment("DEV")
    case unknown =>
      logger.error(s"Unknown Stage specified: '$unknown', falling back to Zuora DEV env")
      ZuoraEnvironment("DEV")
  }
}

object ConfigReads {

  case class ConfigFailure(error: String) extends Throwable

}
