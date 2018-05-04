package com.gu.util.config

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.ConfigReads.configReads
import com.gu.util.reader.Types._
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}
import scala.util.Try
import scalaz.{-\/, \/, \/-}

object LoadConfig extends Logging {

  def default[StepsConfig: Reads]: (Stage, Try[String]) => FailableOp[Config[StepsConfig]] =
    apply[StepsConfig](parseConfig[StepsConfig])

  def apply[StepsConfig](parseConfig: String => ConfigFailure \/ Config[StepsConfig])(
    stage: Stage,
    s3Load: Try[String]
  ): FailableOp[Config[StepsConfig]] = {
    logger.info(s"${this.getClass} Lambda is starting up in $stage")
    for {
      textConfig <- s3Load.toFailableOp("load config from s3")
      config <- parseConfig(textConfig).toFailableOp("parse config file")
      _ <- if (stage == config.stage)
        \/-(())
      else
        -\/(ApiGatewayResponse.internalServerError(s"running in $stage with config from ${config.stage}"))
    } yield config
  }

  def parseConfig[StepsConfig: Reads](jsonConfig: String): \/[ConfigFailure, Config[StepsConfig]] = {
    Json.fromJson[Config[StepsConfig]](Json.parse(jsonConfig)) match {
      case validConfig: JsSuccess[Config[StepsConfig]] =>
        logger.info(s"Successfully parsed JSON config")
        \/-(validConfig.value)
      case error: JsError =>
        logger.error(s"Failed to parse JSON config")
        logger.warn(s"Failed to parse JSON config: $error")
        -\/(ConfigFailure(error))
    }
  }

}
