package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.gu.AppIdentity
import com.gu.digital_voucher_api.imovo.ImovoClient
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp.asynchttpclient.cats.AsyncHttpClientCatsBackend
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

final case class DigitalVoucherApiAppError(message: String)

object DigitalVoucherApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(appIdentity: AppIdentity): EitherT[IO, DigitalVoucherApiAppError, HttpRoutes[IO]] = {
    DigitalVoucherApiApp(appIdentity, AsyncHttpClientCatsBackend[cats.effect.IO]())
  }

  def apply[S](appIdentity: AppIdentity, backend: SttpBackend[IO, S]): EitherT[IO, DigitalVoucherApiAppError, HttpRoutes[IO]] = {
    for {
      config <- ConfigLoader.loadConfig[IO](appIdentity: AppIdentity)
        .leftMap(error => DigitalVoucherApiAppError(error.toString))
      imovoClient <- ImovoClient(backend, config.imovoBaseUrl, config.imovoApiKey)
        .leftMap(error => DigitalVoucherApiAppError(error.toString))
      routes <- EitherT.rightT[IO, DigitalVoucherApiAppError](
        createLogging()(DigitalVoucherApiRoutes(DigitalVoucherService(imovoClient)))
      )
    } yield routes
  }

  def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CaseInsensitiveString => headerKey.value == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) })
    )
  }
}
