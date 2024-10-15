package com.gu.productmove.zuora.rest

import com.gu.productmove.Secrets
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.zuora.rest.ZuoraClientLive.ZuoraRestConfig
import sttp.client3.*
import sttp.model.Uri
import zio.json.*
import zio.{Task, ZIO, ZLayer}

import scala.util.Try

object ZuoraClientLive {

  case class ZuoraRestConfig(
      baseUrl: String,
      username: String,
      password: String,
  )

  object ZuoraRestConfig {
    given JsonDecoder[ZuoraRestConfig] = DeriveJsonDecoder.gen[ZuoraRestConfig]
  }

  val layer: ZLayer[SttpBackend[Task, Any] with Secrets, Throwable, ZuoraClient] =
    ZLayer {
      for {
        secrets <- ZIO.service[Secrets]
        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
        zuoraClient <- ZIO.fromTry(impl(secrets, sttpClient))
        _ <- ZIO.logDebug("zuoraBaseUrl:   " + zuoraClient.baseUrl.toString)
      } yield zuoraClient
    }

  def impl(secrets: Secrets, sttpClient: SttpBackend[Task, Any]): Try[ZuoraClientLive] = {
    for {
      zuoraApiSecrets <- secrets.getZuoraApiUserSecrets
      baseUrl <- Uri.parse(zuoraApiSecrets.baseUrl + "/").left.map(e => new Throwable("uri parse: " + e)).toTry
    } yield ZuoraClientLive(
      baseUrl,
      sttpClient,
      ZuoraRestConfig(zuoraApiSecrets.baseUrl, zuoraApiSecrets.username, zuoraApiSecrets.password),
    )
  }
}

private class ZuoraClientLive(val baseUrl: Uri, sttpClient: SttpBackend[Task, Any], zuoraRestConfig: ZuoraRestConfig)
    extends ZuoraClient {

  override def send(request: Request[Either[String, String], Any]): Task[String] = {
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
      .map(_.body.left.map(e => new Throwable("response failure: " + e)))
      .absolve
  }
}

trait ZuoraClient {

  def send(request: Request[Either[String, String], Any]): Task[String]

}

// zuora commonly returns status = 200 and success = false.
// this usually causes a deserialisation error and often makes it hard to understand what went wrong
// This detects that and stops straight away.
object ZuoraRestBody {

  case class ZuoraClientError(message: String, reasons: List[Reason]) extends Throwable(message)

  // the `/v1/object/` endpoint which we are using to get the user's payment method does not have a success property, and instead returns `size: "0"` if nothing was found
  // Zuora either returns a "success" property with a lower or upper case starting letter, hence the need for SuccessCheckLowercase and SuccessCheckCapitalised enums
  enum ZuoraSuccessCheck {
    case SuccessCheckSize, SuccessCheckLowercase, SuccessCheckCapitalised, None
  }

  case class Reason(
      code: Int,
      message: String,
  ) derives JsonDecoder

  case class ZuoraSuccessCapitalised(Success: Boolean, reasons: Option[List[Reason]]) derives JsonDecoder
  case class ZuoraSuccessLowercase(success: Boolean, reasons: Option[List[Reason]]) derives JsonDecoder
  case class ZuoraSuccessSize(size: Option[Int]) derives JsonDecoder

  def attemptDecode[A](body: String)(implicit decoder: JsonDecoder[A]) =
    body.fromJson[A].left.map(e => new Throwable("attempt decode: " + e))

  def parseIfSuccessful[A: JsonDecoder](
      body: String,
      zuoraSuccessCheck: ZuoraSuccessCheck,
  ): Either[Throwable, A] = {
    val isSuccessful: Either[Throwable, Unit] = zuoraSuccessCheck match {
      case ZuoraSuccessCheck.SuccessCheckSize =>
        for {
          zuoraResponse <- attemptDecode[ZuoraSuccessSize](body)
          succeeded = zuoraResponse.size.isEmpty // size field only exists if it's not found.
          _ <- if (succeeded) Right(()) else Left(new Throwable(s"size = 0, body: $body"))
        } yield ()

      case ZuoraSuccessCheck.SuccessCheckLowercase =>
        for {
          zuoraResponse <- attemptDecode[ZuoraSuccessLowercase](body)
          _ <-
            if (zuoraResponse.success) Right(())
            else Left(ZuoraClientError(body, zuoraResponse.reasons.getOrElse(Nil)))
        } yield ()

      case ZuoraSuccessCheck.SuccessCheckCapitalised =>
        for {
          zuoraResponse <- attemptDecode[ZuoraSuccessCapitalised](body)
          _ <-
            if (zuoraResponse.Success) Right(())
            else Left(ZuoraClientError(body, zuoraResponse.reasons.getOrElse(Nil)))
        } yield ()
      case ZuoraSuccessCheck.None => Right(())
    }

    isSuccessful.flatMap(_ => body.fromJson[A].left.map(errorMessage => new Throwable(s"json parsing error $errorMessage with body $body")))
  }

}
