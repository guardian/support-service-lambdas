package com.gu.util.config

import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.Try

case class SecretLocation[CONFIG](path: String) {
  def toPath(stage: Stage): String = s"${stage.value}/$path"
}

class LoadSecretsManagerConfig(stage: Stage, fetchString: String => Try[String]) extends Logging {
  def load[CONFIG](implicit location: SecretLocation[CONFIG], reads: Reads[CONFIG]): Either[ConfigFailure, CONFIG] = {
    val secretId = location.toPath(stage)
    logger.info(s"Loading configuration from secret $secretId")
    val result = for {
      contents <- fetchString(secretId).toEither.left
        .map(error => ConfigFailure(s"Failed to read secret $secretId (${error.getClass.getSimpleName})"))
      json <- Try(Json.parse(contents)).toEither.left
        .map(_ => ConfigFailure(s"Secret $secretId is not valid JSON"))
      config <- json.validate[CONFIG] match {
        case JsSuccess(value, _) => Right(value)
        case JsError(errors) =>
          val paths = errors.map(_._1.toString).distinct.mkString(", ")
          Left(ConfigFailure(s"Secret $secretId has invalid configuration at: $paths"))
      }
    } yield config
    result.left.foreach(error => logger.error(error.error))
    result
  }
}

object LoadSecretsManagerConfig {
  def apply(stage: Stage, fetchString: String => Try[String]): LoadSecretsManagerConfig =
    new LoadSecretsManagerConfig(stage, fetchString)
}
