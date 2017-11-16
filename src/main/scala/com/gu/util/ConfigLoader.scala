package com.gu.util

import com.gu.util.ETConfig.ETSendKeysForAttempt
import play.api.libs.functional.syntax._
import play.api.libs.json._

import scala.util.{ Failure, Success, Try }

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String
)

case class ETConfig(
  stageETIDForAttempt: ETSendKeysForAttempt,
  clientId: String,
  clientSecret: String
)

object ZuoraRestConfig {
  implicit val zuoraConfigReads: Reads[ZuoraRestConfig] = (
    (JsPath \ "baseUrl").read[String] and
    (JsPath \ "username").read[String] and
    (JsPath \ "password").read[String]
  )(ZuoraRestConfig.apply _)
}

object ETConfig {

  implicit val etSendKeysForAttemptReads: Reads[ETSendKeysForAttempt] = new Reads[ETSendKeysForAttempt] {

    override def reads(jsValue: JsValue): JsResult[ETSendKeysForAttempt] = {
      jsValue match {
        case JsObject(stringToJsValue) =>
          val jsResults = stringToJsValue.map({
            case (attemptText: String, JsString(exactTargetTriggeredSendKey)) =>
              val triedInt = Try { Integer.parseInt(attemptText) }
              triedInt match {
                case Success(attempt) => JsSuccess((attempt, exactTargetTriggeredSendKey))
                case Failure(f) => JsError(s"num parse error in config map for $attemptText: $f")
              }
            case other => JsError(s"value of exactTargetTriggeredSendKey wasn't a string: $other")
          })
          val allErrors = jsResults.collect {
            case JsError(errors) => errors
          }.flatten
          if (allErrors.nonEmpty) {
            JsError(allErrors.toList)
          } else {
            JsSuccess(ETSendKeysForAttempt(jsResults.collect {
              case JsSuccess(attemptTSKey, _) => attemptTSKey
            }.toMap))
          }
        case other => JsError(s"wrong type: $other")
      }
    }

  }

  case class ETSendKeysForAttempt(etSendKeysForAttempt: Map[Int, String])

  implicit val zuoraConfigReads: Reads[ETConfig] = (
    (JsPath \ "stageETIDForAttempt").read[ETSendKeysForAttempt] and
    (JsPath \ "clientId").read[String] and
    (JsPath \ "clientSecret").read[String]
  )(ETConfig.apply _)
}

case class TrustedApiConfig(apiClientId: String, apiToken: String, tenantId: String)

object TrustedApiConfig {
  implicit val apiConfigReads: Reads[TrustedApiConfig] = (
    (JsPath \ "apiClientId").read[String] and
    (JsPath \ "apiToken").read[String] and
    (JsPath \ "tenantId").read[String]
  )(TrustedApiConfig.apply _)
}

case class Config(stage: String, trustedApiConfig: TrustedApiConfig, zuoraRestConfig: ZuoraRestConfig, etConfig: ETConfig)

object Config extends Logging {

  implicit val configReads: Reads[Config] = (
    (JsPath \ "stage").read[String] and
    (JsPath \ "trustedApiConfig").read[TrustedApiConfig] and
    (JsPath \ "zuoraRestConfig").read[ZuoraRestConfig] and
    (JsPath \ "etConfig").read[ETConfig]
  )(Config.apply _)

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
