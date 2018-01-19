package com.gu.util

import com.gu.util.ETConfig.ETSendIds
import play.api.libs.functional.syntax._
import play.api.libs.json._

import scala.util.{ Failure, Success, Try }

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String)

case class ETConfig(
  etSendIDs: ETSendIds,
  clientId: String,
  clientSecret: String)

object ZuoraRestConfig {
  implicit val zuoraConfigReads: Reads[ZuoraRestConfig] = (
    (JsPath \ "baseUrl").read[String] and
    (JsPath \ "username").read[String] and
    (JsPath \ "password").read[String])(ZuoraRestConfig.apply _)
}

object ETConfig {

  implicit val idReads: Reads[ETSendId] = JsPath.read[String].map(ETSendId.apply)

  implicit val idsReads: Reads[ETSendIds] = Json.reads[ETSendIds]

  case class ETSendId(id: String) extends AnyVal
  case class ETSendIds(
    pf1: ETSendId,
    pf2: ETSendId,
    pf3: ETSendId,
    pf4: ETSendId,
    cancelled: ETSendId) {
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
    (JsPath \ "clientSecret").read[String])(ETConfig.apply _)
}

case class TrustedApiConfig(apiToken: String, tenantId: String)

object TrustedApiConfig {
  implicit val apiConfigReads: Reads[TrustedApiConfig] = (
    (JsPath \ "apiToken").read[String] and
    (JsPath \ "tenantId").read[String])(TrustedApiConfig.apply _)
}

case class StripeSecretKey(key: String) extends AnyVal

object StripeSecretKey {
  implicit val stripeSecretKeyReads = Json.reads[StripeSecretKey]
}

case class StripeWebhook(ukStripeSecretKey: StripeSecretKey, auStripeSecretKey: StripeSecretKey)
object StripeWebhook {
  implicit val stripeWebhookConfigReads: Reads[StripeWebhook] = (
    (JsPath \ "api.key.secret").read[String].map(StripeSecretKey.apply) and
    (JsPath \ "au-membership.key.secret").read[String].map(StripeSecretKey.apply))(StripeWebhook.apply _)
}

case class StripeConfig(customerSourceUpdatedWebhook: StripeWebhook)
object StripeConfig {
  implicit val stripeConfigReads = Json.reads[StripeConfig]
}

case class Config(
  stage: Stage,
  trustedApiConfig: TrustedApiConfig,
  zuoraRestConfig: ZuoraRestConfig,
  etConfig: ETConfig,
  stripeConfig: StripeConfig)

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
}

object Config extends Logging {

  implicit val configReads: Reads[Config] = (
    (JsPath \ "stage").read[String].map(Stage.apply) and
    (JsPath \ "trustedApiConfig").read[TrustedApiConfig] and
    (JsPath \ "zuoraRestConfig").read[ZuoraRestConfig] and
    (JsPath \ "etConfig").read[ETConfig] and
    (JsPath \ "stripe").read[StripeConfig])(Config.apply _)

  def parseConfig(jsonConfig: String): Try[Config] = {
    Json.fromJson[Config](Json.parse(jsonConfig)) match {
      case validConfig: JsSuccess[Config] =>
        logger.info(s"Successfully parsed JSON config")
        Success(validConfig.value)
      case error: JsError =>
        logger.error(s"Failed to parse JSON config")
        logger.warn(s"Failed to parse JSON config: $error")
        Failure(ConfigFailure(error))
    }
  }

  case class ConfigFailure(error: JsError) extends Throwable

}
