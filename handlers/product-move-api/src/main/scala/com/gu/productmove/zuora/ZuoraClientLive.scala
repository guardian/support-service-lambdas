package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.ZuoraClientLive.ZuoraRestConfig
import com.gu.productmove.zuora.ZuoraRestBody.ZuoraSuccess
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{RIO, Task, ZIO, ZLayer}

object ZuoraClientLive {

  case class ZuoraRestConfig(
    baseUrl: String,
    username: String,
    password: String,
  )

  object ZuoraRestConfig {
    given JsonDecoder[ZuoraRestConfig] = DeriveJsonDecoder.gen[ZuoraRestConfig]
  }

  val bucket = "gu-reader-revenue-private"

  private def key(stage: Stage, version: Int = 1) = {
    val basePath = s"membership/support-service-lambdas/$stage"

    val versionString = if (stage == Stage.DEV) "" else s".v${version}"
    val relativePath = s"zuoraRest-$stage$versionString.json"
    s"$basePath/$relativePath"
  }

  val layer: ZLayer[AwsS3 with Stage with SttpClient, String, ZuoraClient] = {
    val zuoraZio = for {
      stage <- ZIO.service[Stage]
      fileContent <- AwsS3.getObject(bucket, key(stage)).mapError(_.toString)
      zuoraRestConfig <- ZIO.fromEither(summon[JsonDecoder[ZuoraRestConfig]].decodeJson(fileContent))
      baseUrl <- ZIO.fromEither(Uri.parse(zuoraRestConfig.baseUrl + "/"))
      _ <- ZIO.log("ZuoraConfig: " + zuoraRestConfig.toString)
      _ <- ZIO.log("baseUrl: " + baseUrl.toString)
      sttpClient <- ZIO.service[SttpClient]
    } yield new ZuoraClient:
      override def send[T](request: Request[T, ZioStreams with Effect[Task] with WebSockets]): ZIO[Any, String, Response[T]] = {
        val absoluteUri = baseUrl.resolve(request.uri)
        sttpClient.send(
          request
            .headers(Map(
              "apiSecretAccessKey" -> zuoraRestConfig.password,
              "apiAccessKeyId" -> zuoraRestConfig.username
            ))
            .copy(uri = absoluteUri)
        ).mapError(_.toString)
      }
    ZLayer.fromZIO(zuoraZio)
  }

}

trait ZuoraClient {

  def send[T](request: Request[T, ZioStreams with Effect[Task] with WebSockets]): ZIO[Any, String, Response[T]]

}
object ZuoraClient {

  def get[T: JsonDecoder](relativeUrl: Uri): ZIO[ZuoraClient, String, Response[Either[String, T]]] =
    ZIO.serviceWithZIO[ZuoraClient](_.send(
      basicRequest
        .get(relativeUrl)
        .mapResponse(ZuoraRestBody.parseIfSuccessful[T])
    ))

}

// zuora commonly returns status = 200 and success = false.
// this usually causes a deserialisation error and often makes it hard to understand what went wrong
// This detects that and stops straight away.
object ZuoraRestBody {

  case class ZuoraSuccess(success: Boolean)

  def parseIfSuccessful[A: JsonDecoder](body: Either[String, String]): Either[String, A] = {
    val successDecoder: JsonDecoder[ZuoraSuccess] = DeriveJsonDecoder.gen[ZuoraSuccess]
    for {
      successBody <- body
      zuoraSuccessFlag <- successDecoder.decodeJson(successBody)
      parsedResponse <-
        if (zuoraSuccessFlag.success)
          successBody.fromJson[A]
        else Left(successBody)
    } yield parsedResponse
  }

}
