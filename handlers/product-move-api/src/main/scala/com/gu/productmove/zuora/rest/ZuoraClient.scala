package com.gu.productmove.zuora.rest

import com.gu.productmove.AwsS3
import com.gu.productmove.GuReaderRevenuePrivateS3.{bucket, key}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.Util.getFromEnv
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  ErrorResponse,
  InternalServerError,
  OutputBody,
  TransactionError,
}
import com.gu.productmove.zuora.rest.ZuoraClient
import com.gu.productmove.zuora.rest.ZuoraClientLive.ZuoraRestConfig
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, ZIO, ZLayer}

object ZuoraClientLive {

  case class ZuoraRestConfig(
      baseUrl: String,
      username: String,
      password: String,
  )

  object ZuoraRestConfig {
    given JsonDecoder[ZuoraRestConfig] = DeriveJsonDecoder.gen[ZuoraRestConfig]
  }

  val layer: ZLayer[SttpBackend[Task, Any], String, ZuoraClient] =
    ZLayer {
      for {
        zuoraBaseUrl <- ZIO.fromEither(getFromEnv("zuoraBaseUrl")).mapError(x => InternalServerError(x))
        zuoraUsername <- ZIO.fromEither(getFromEnv("zuoraUsername")).mapError(x => InternalServerError(x))
        zuoraPassword <- ZIO.fromEither(getFromEnv("zuoraPassword")).mapError(x => InternalServerError(x))

        baseUrl <- ZIO.fromEither(Uri.parse(zuoraBaseUrl + "/"))

        _ <- ZIO.log("zuoraBaseUrl:   " + baseUrl.toString)

        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
      } yield ZuoraClientLive(baseUrl, sttpClient, ZuoraRestConfig(zuoraBaseUrl, zuoraUsername, zuoraPassword))
    }
}

private class ZuoraClientLive(baseUrl: Uri, sttpClient: SttpBackend[Task, Any], zuoraRestConfig: ZuoraRestConfig)
    extends ZuoraClient:

  override def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String] = {
    val absoluteUri = baseUrl.resolve(request.uri)
    sttpClient
      .send(
        request
          .headers(
            Map(
              "zuora-version" -> "211.0",
              "apiSecretAccessKey" -> zuoraRestConfig.password,
              "apiAccessKeyId" -> zuoraRestConfig.username,
            ),
          )
          .copy(uri = absoluteUri),
      )
      .mapError(e => InternalServerError(e.toString))
      .map(_.body)
      .absolve
  }

trait ZuoraClient {

  def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String]

}

// zuora commonly returns status = 200 and success = false.
// this usually causes a deserialisation error and often makes it hard to understand what went wrong
// This detects that and stops straight away.
object ZuoraRestBody {

  // the `/v1/object/` endpoint which we are using to get the user's payment method does not have a success property, and instead returns `size: "0"` if nothing was found
  // Zuora either returns a "success" property with a lower or upper case starting letter, hence the need for SuccessCheckLowercase and SuccessCheckCapitalised enums
  enum ZuoraSuccessCheck:
    case SuccessCheckSize, SuccessCheckLowercase, SuccessCheckCapitalised, None

  case class Reason(
      code: Int,
      message: String,
  )
  given JsonDecoder[Reason] = DeriveJsonDecoder.gen

  case class ZuoraSuccessCapitalised(Success: Boolean, reasons: Option[List[Reason]])
  case class ZuoraSuccessLowercase(success: Boolean, reasons: Option[List[Reason]])
  case class ZuoraSuccessSize(size: Option[Int])

  def parseIfSuccessful[A: JsonDecoder](
      body: String,
      zuoraSuccessCheck: ZuoraSuccessCheck,
  ): Either[ErrorResponse, A] = {
    val isSuccessful: Either[ErrorResponse, Unit] = zuoraSuccessCheck match {
      case ZuoraSuccessCheck.SuccessCheckSize =>
        for {
          zuoraResponse <- DeriveJsonDecoder.gen[ZuoraSuccessSize].decodeJson(body)
          succeeded = zuoraResponse.size.isEmpty // size field only exists if it's not found.
          isSuccessful <- if (succeeded) Right(()) else Left(InternalServerError(s"size = 0, body: $body"))
        } yield ()

      case ZuoraSuccessCheck.SuccessCheckLowercase =>
        for {
          zuoraResponse <- DeriveJsonDecoder.gen[ZuoraSuccessLowercase].decodeJson(body)
          isSuccessful <-
            if (zuoraResponse.success) Right(())
            else
              zuoraResponse.reasons match {
                case Some(reasons) if reasons.exists(_.code == 53500099) =>
                  Left(TransactionError(reasons.map(_.message).mkString(" ")))
                case Some(reasons) => Left(InternalServerError(reasons.map(_.message).mkString(" ")))
                case None => Left(InternalServerError(s"success = false, body: $body"))
              }
        } yield ()

      case ZuoraSuccessCheck.SuccessCheckCapitalised =>
        for {
          zuoraResponse <- DeriveJsonDecoder.gen[ZuoraSuccessCapitalised].decodeJson(body)
          isSuccessful <-
            if (zuoraResponse.Success) Right(())
            else
              zuoraResponse.reasons match {
                case Some(reasons) if reasons.exists(_.code == 53500099) =>
                  Left(TransactionError(reasons.map(_.message).mkString(" ")))
                case Some(reasons) => Left(InternalServerError(reasons.map(_.message).mkString(" ")))
                case None => Left(InternalServerError(s"success = false, body: $body"))
              }
        } yield ()
      case ZuoraSuccessCheck.None => Right(())
    }

    isSuccessful.flatMap(_ => body.fromJson[A])
  }

}
