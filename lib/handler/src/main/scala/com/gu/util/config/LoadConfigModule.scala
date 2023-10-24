package com.gu.util.config

import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import play.api.libs.json._
import com.gu.effects.S3Location

import scala.util.{Failure, Success, Try}

case class ConfigWithStage(stage: String)

object ConfigWithStage {
  implicit val reads = Json.reads[ConfigWithStage]
}

object LoadConfigModule extends Logging {

  type StringFromS3 = S3Location => Try[String]

  val bucketName = "gu-reader-revenue-private"

  // we need this extra class here because otherwise we cannot partially apply the LoadConfig apply method without specifying the generic param
  class LoadConfigModule(stage: Stage, fetchString: StringFromS3) {
    def load[CONF](implicit configLocation: ConfigLocation[CONF], reads: Reads[CONF]): Either[ConfigFailure, CONF] = {
      logger.info(s"Attempting to load config in $stage")
      val s3Location = S3Location(bucket = bucketName, key = configLocation.toPath(stage))
      for {
        configStr <- toDisjunction(fetchString(s3Location))
        jsValue <- toDisjunction(Try(Json.parse(configStr)))
        _ <- validateStage(jsValue, stage)
        config <- toDisjunction(Json.fromJson[CONF](jsValue))
      } yield config
    }
  }

  def apply(stage: Stage, fetchString: StringFromS3) = new LoadConfigModule(stage = stage, fetchString = fetchString)

  def validateStage(jsValue: JsValue, expectedStage: Stage): Either[ConfigFailure, Unit] = {
    jsValue.validate[ConfigWithStage] match {
      case JsSuccess(ConfigWithStage(expectedStage.value), _) => Right(())
      case JsSuccess(ConfigWithStage(otherStage), _) =>
        Left(ConfigFailure(s"Expected to load ${expectedStage.value} config, but loaded $otherStage config"))
      case JsError(error) => Left(ConfigFailure(s"could not parse stage in configuration file: ${error}"))
    }
  }

  def toDisjunction[A](t: Try[A]) = t match {
    case Success(s) => Right(s)
    case Failure(e) =>
      logger.error(s"error parsing json: ${e.toString}")
      Left(ConfigFailure(e.toString))
  }

  def toDisjunction[A](jsResult: JsResult[A]) = jsResult match {
    case JsSuccess(jsValue, _) => Right(jsValue)
    case JsError(error) =>
      logger.error(s"error parsing json $error")
      Left(ConfigFailure(s"error parsing json : $error"))
  }
}
