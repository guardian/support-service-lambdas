package com.gu.util.config

import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.ConfigReads.configReads
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}
import scalaz.{-\/, \/, \/-}

object LoadConfig extends Logging {

  def default[StepsConfig: Reads]: (Stage, ConfigFailure \/ String) => ConfigFailure \/ Config[StepsConfig] =
    apply[StepsConfig](parseConfig[StepsConfig])

  def apply[StepsConfig](parseConfig: String => ConfigFailure \/ Config[StepsConfig])(
    expectedConfigStage: Stage,
    s3Load: ConfigFailure \/ String
  ): ConfigFailure \/ Config[StepsConfig] = {
    logger.info(s"${this.getClass} Lambda is starting up, loading config for $expectedConfigStage")
    for {
      textConfig <- s3Load
      config <- parseConfig(textConfig)
      _ <- safetyCheck(expectedConfigStage, config.stage)
    } yield config
  }

  def safetyCheck(expectedConfigStage: Stage, stageFromConfigFile: Stage) = {
    if (expectedConfigStage != stageFromConfigFile)
      -\/(ConfigFailure(s"Expected to load $expectedConfigStage config, but loaded $stageFromConfigFile config"))
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
