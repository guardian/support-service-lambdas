package com.gu.util.config

import com.gu.util.Logging
import play.api.libs.functional.syntax._
import play.api.libs.json._

case class ETConfig(
  etSendIDs: ETConfig.ETSendIds,
  clientId: String,
  clientSecret: String
)

object ETConfig {

  implicit val idReads: Reads[ETSendId] = JsPath.read[String].map(ETSendId.apply)

  implicit val idsReads: Reads[ETSendIds] = Json.reads[ETSendIds]

  case class ETSendId(id: String) extends AnyVal

  case class ETSendIds(
    pf1: ETSendId,
    pf2: ETSendId,
    pf3: ETSendId,
    pf4: ETSendId,
    cancelled: ETSendId
  ) {
    def find(attempt: Int): Option[ETSendId] = Some(attempt match {
      case 1 => pf1
      case 2 => pf2
      case 3 => pf3
      case 4 => pf4
      case _ => ETSendId("")
    }).filter(_.id != "")
  }

  implicit val zuoraConfigReads: Reads[ETConfig] = (
    (JsPath \ "etSendIDs").read[ETSendIds] and
    (JsPath \ "clientId").read[String] and
    (JsPath \ "clientSecret").read[String]
  )(ETConfig.apply _)
}

case class TrustedApiConfig(apiToken: String, tenantId: String)

object TrustedApiConfig {
  implicit val location = ConfigLocation[TrustedApiConfig](path = "trustedApi", version = 1)
  implicit val apiConfigReads = Json.reads[TrustedApiConfig]
}

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

case class StripeConfig(customerSourceUpdatedWebhook: StripeWebhook, signatureChecking: Boolean)

object StripeConfig {
  implicit val stripeConfigReads: Reads[StripeConfig] = (
    (JsPath \ "customerSourceUpdatedWebhook").read[StripeWebhook] and
    (JsPath \ "signatureChecking").readNullable[String].map(!_.contains("false"))
  )(StripeConfig.apply _)
}

case class Config[StepsConfig](
  stage: Stage,
  trustedApiConfig: TrustedApiConfig,
  stepsConfig: StepsConfig,
  etConfig: ETConfig,
  stripeConfig: StripeConfig
)

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
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

object ConfigReads {

  implicit def configReads[StepsConfig: Reads]: Reads[Config[StepsConfig]] = (
    (JsPath \ "stage").read[String].map(Stage.apply) and
    (JsPath \ "trustedApiConfig").read[TrustedApiConfig] and
    (JsPath \ "stepsConfig").read[StepsConfig] and
    (JsPath \ "etConfig").read[ETConfig] and
    (JsPath \ "stripe").read[StripeConfig]
  )(Config.apply[StepsConfig] _)

  case class ConfigFailure(error: String)

}
