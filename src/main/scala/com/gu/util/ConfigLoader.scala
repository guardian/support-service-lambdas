package com.gu.util

import com.amazonaws.services.s3.model.GetObjectRequest
import com.gu.effects.{ AwsS3, Logging }
import play.api.libs.json._
import play.api.libs.functional.syntax._

import scala.util.{ Failure, Success, Try }

case class ZuoraRestConfig(
  baseUrl: String,
  username: String,
  password: String
)

case class ETConfig(
  stageETIDForAttempt: Map[Int, String],
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

  implicit val mapReads: Reads[Map[Int, String]] = new Reads[Map[Int, String]] {

    override def reads(json: JsValue) = {
      json match {
        case JsObject(map) =>
          val jsResults = map.map({
            case (num: String, JsString(key)) =>
              val aaa = Try { Integer.parseInt(num) }
              aaa match {
                case Success(num) => JsSuccess((num, key))
                case Failure(f) => JsError(s"num parse error in config: ${f}")
              }
            case other => JsError(s"value of TS key wasn't a string: $other")
          })
          val allErrors = jsResults.collect {
            case JsError(errors) => errors
          }.flatten
          if (allErrors.nonEmpty) {
            JsError(allErrors.toList)
          } else {
            JsSuccess(jsResults.collect {
              case JsSuccess(a, _) => a
            }.toMap)
          }
        case other => JsError(s"wrong type: $other")
      }
    }

  }

  implicit val zuoraConfigReads: Reads[ETConfig] = (
    (JsPath \ "stageETIDForAttempt").read[Map[Int, String]] and
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

case class Config(trustedApiConfig: TrustedApiConfig, zuoraRestConfig: ZuoraRestConfig, etConfig: ETConfig)

object Config extends Logging {

  implicit val configReads: Reads[Config] = (
    (JsPath \ "trustedApiConfig").read[TrustedApiConfig] and
    (JsPath \ "zuoraRestConfig").read[ZuoraRestConfig] and
    (JsPath \ "etConfig").read[ETConfig]
  )(Config.apply _)

  def load(stage: String): Try[Config] = {
    logger.info(s"Attempting to load config in $stage")
    val bucket = s"payment-failure-lambdas-private/$stage"
    val key = "payment-failure-lambdas.private.json"
    val request = new GetObjectRequest(bucket, key)
    for {
      string <- AwsS3.fetchString(request)
      config <- parseConfig(string)
    } yield config
  }

  def parseConfig(jsonConfig: String): Try[Config] = {
    Json.fromJson[Config](Json.parse(jsonConfig)) match {
      case validConfig: JsSuccess[Config] => {
        logger.info(s"Successfully parsed JSON config")
        Success(validConfig.value)
      }
      case error: JsError => {
        logger.error(s"Failed to parse JSON config: $error")
        Failure(new ConfigFailure(error))
      }
    }
  }

  case class ConfigFailure(error: JsError) extends Throwable

}
