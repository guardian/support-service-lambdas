package com.gu.util.config

import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.ConfigReads.configReads
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}
import scalaz.{-\/, \/, \/-}

object LoadConfig extends Logging {

  def default[StepsConfig: Reads]: (Stage, ConfigFailure \/ String, Boolean) => ConfigFailure \/ Config[StepsConfig] =
    apply[StepsConfig](parseConfig[StepsConfig])

  def apply[StepsConfig](parseConfig: String => ConfigFailure \/ Config[StepsConfig])(
    stage: Stage,
    s3Load: ConfigFailure \/ String,
    shouldCrossCheckStage: Boolean = true
  ): ConfigFailure \/ Config[StepsConfig] = {
    logger.info(s"${this.getClass} Lambda is starting up in $stage")
    for {
      textConfig <- s3Load
      config <- parseConfig(textConfig)
      _ <- safetyCheck(shouldCrossCheckStage, stage, config.stage)
    } yield config
  }

  def safetyCheck(shouldCompare: Boolean, stageFromEnv: Stage, stageFromConfigFile: Stage) = {
    if (shouldCompare && stageFromEnv != stageFromConfigFile)
      -\/(ConfigFailure(s"Attempting to run in $stageFromEnv with config from $stageFromConfigFile"))
    else
      \/-(())
  }

  def parseConfig[StepsConfig: Reads](jsonConfig: String): ConfigFailure \/ Config[StepsConfig] = {
    Json.fromJson[Config[StepsConfig]](Json.parse(jsonConfig)) match {
      case validConfig: JsSuccess[Config[StepsConfig]] =>
        logger.info(s"Successfully parsed JSON config")
        \/-(validConfig.value)
      case error: JsError =>
        logger.error(s"Failed to parse JSON config")
        logger.warn(s"Failed to parse JSON config: $error")
        -\/(ConfigFailure(error.toString))
    }
  }

}
