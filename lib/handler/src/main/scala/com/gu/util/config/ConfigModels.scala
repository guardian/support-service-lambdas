package com.gu.util.config

import com.gu.util.Logging
import play.api.libs.functional.syntax._
import play.api.libs.json._

case class EmailConfig(
  emailSendIds: EmailConfig.EmailSendIds
)

object EmailConfig {
  implicit val location = ConfigLocation[EmailConfig](path = "email", version = 1)

  implicit val idReads: Reads[EmailSendId] = JsPath.read[String].map(EmailSendId.apply)

  implicit val idsReads: Reads[EmailSendIds] = Json.reads[EmailSendIds]

  case class EmailSendId(id: String) extends AnyVal

  case class EmailSendIds(
    pf1: EmailSendId,
    pf2: EmailSendId,
    pf3: EmailSendId,
    pf4: EmailSendId,
    cancelled: EmailSendId
  ) {
    def find(attempt: Int): Option[EmailSendId] = Some(attempt match {
      case 1 => pf1
      case 2 => pf2
      case 3 => pf3
      case 4 => pf4
      case _ => EmailSendId("")
    }).filter(_.id != "")
  }

  implicit val etConfigReads: Reads[EmailConfig] = Json.reads[EmailConfig]
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
  implicit val location = ConfigLocation[StripeConfig](path = "stripe", version = 1)

  implicit val stripeConfigReads: Reads[StripeConfig] = (
    (JsPath \ "customerSourceUpdatedWebhook").read[StripeWebhook] and
    (JsPath \ "signatureChecking").readNullable[String].map(!_.contains("false"))
  )(StripeConfig.apply _)
}

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

  case class ConfigFailure(error: String)

}
