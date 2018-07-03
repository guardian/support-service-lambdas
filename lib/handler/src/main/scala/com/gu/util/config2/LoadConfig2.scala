package com.gu.util.config2

import com.amazonaws.services.s3.model.GetObjectRequest
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import play.api.libs.json._
import scalaz.{-\/, \/, \/-}

import scala.util.{Failure, Success, Try}

case class ConfigLocation[CONFIG](val path: String, version: Int)

class LoadConfig2(stage: Stage, fetchString: GetObjectRequest => Try[String]) extends Logging {

  //todo maybe this is a good chance to change the directory we load the config from
  val basePath = s"membership/payment-failure-lambdas/${stage.value}"
  val bucketName = "gu-reader-revenue-private"

  def apply[CONF](implicit configLocation: ConfigLocation[CONF], reads: Reads[CONF]): ConfigFailure \/ CONF = {
    logger.info(s"Attempting to load config in $stage")
    val relativePath = if (stage.value == "DEV") configLocation.path else pathWithVersion(configLocation)
    val request = new GetObjectRequest(bucketName, s"$basePath/$relativePath")

    for {
      configStr <- toDisjunction(fetchString(request))
      jsValue <- toDisjunction(Try(Json.parse(configStr)))
      _ <- validateStage(jsValue)
      config <- toDisjunction(Json.fromJson[CONF](jsValue))
    } yield config
  }

  def pathWithVersion(configLocation: ConfigLocation[_]) = {
    val path = configLocation.path
    val versionString = s".v${configLocation.version}"
    val lastDotPosition = path.lastIndexOf(".")
    if (lastDotPosition > 0) path.substring(0, lastDotPosition) + versionString + path.substring(lastDotPosition) else path + versionString
  }

  case class ConfigWithStage(stage: String)

  object ConfigWithStage {
    implicit val reads = Json.reads[ConfigWithStage]
  }

  def validateStage(jsValue: JsValue): ConfigFailure \/ Unit = {
    jsValue.validate[ConfigWithStage] match {
      case JsSuccess(ConfigWithStage(stage.value), _) => \/-(())
      case JsSuccess(ConfigWithStage(otherStage), _) => -\/(ConfigFailure(s"Expected to load ${stage.value} config, but loaded $otherStage config"))
      case JsError(error) => -\/(ConfigFailure(s"could not parse stage in configuration file: ${error}"))
    }
  }

  def toDisjunction[A](t: Try[A]) = t match {
    case Success(s) => \/-(s)
    case Failure(e) =>
      logger.error("error parsing json", e)
      -\/(ConfigFailure(e.toString))
  }

  def toDisjunction[A](jsResult: JsResult[A]) = jsResult match {
    case JsSuccess(jsValue, _) => \/-(jsValue)
    case JsError(error) =>
      logger.error(s"error parsing json $error")
      -\/(ConfigFailure(s"error parsing json : $error"))
  }
}

object LoadConfig2 {
  def apply(stage: Stage, fetchString: GetObjectRequest => Try[String]) = new LoadConfig2(stage = stage, fetchString = fetchString)
}
