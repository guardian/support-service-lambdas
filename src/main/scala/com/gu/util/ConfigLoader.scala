package com.gu.util

import com.amazonaws.services.s3.model.GetObjectRequest
import play.api.libs.json._
import play.api.libs.functional.syntax._
import scala.util.{ Failure, Success, Try }

case class ZuoraRestConfig(baseUrl: String, username: String, password: String)

object ZuoraRestConfig {
  implicit val zuoraConfigReads: Reads[ZuoraRestConfig] = (
    (JsPath \ "baseUrl").read[String] and
    (JsPath \ "username").read[String] and
    (JsPath \ "password").read[String]
  )(ZuoraRestConfig.apply _)
}

case class TrustedApiConfig(apiClientId: String, apiToken: String, tenantId: String)

object TrustedApiConfig {
  implicit val apiConfigReads: Reads[TrustedApiConfig] = (
    (JsPath \ "apiClientId").read[String] and
    (JsPath \ "apiToken").read[String] and
    (JsPath \ "tenantId").read[String]
  )(TrustedApiConfig.apply _)
}

case class Config(trustedApiConfig: TrustedApiConfig, zuoraRestConfig: ZuoraRestConfig)

object Config extends Logging {

  implicit val configReads: Reads[Config] = (
    (JsPath \ "trustedApiConfig").read[TrustedApiConfig] and
    (JsPath \ "zuoraRestConfig").read[ZuoraRestConfig]
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
        logger.error("Failed to parse JSON config")
        Failure(new ConfigFailure(error))
      }
    }
  }

  class ConfigFailure(error: JsError) extends Throwable

}
