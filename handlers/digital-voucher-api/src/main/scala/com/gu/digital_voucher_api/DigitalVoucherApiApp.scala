package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.effect.IO
import cats.syntax.all._
import com.gu.AppIdentity
import com.gu.imovo.{ImovoClient, ImovoConfig}
import com.gu.util.config.ConfigLoader
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import sttp.client3.SttpBackend

import scala.concurrent.ExecutionContext
import org.typelevel.ci.CIString

final case class DigitalVoucherApiError(message: String)

object DigitalVoucherApiApp extends LazyLogging {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  def apply[S](
      appIdentity: AppIdentity,
      backend: SttpBackend[IO, S],
  ): EitherT[IO, DigitalVoucherApiError, HttpRoutes[IO]] = {
    for {
      imovoConfig <- ConfigLoader
        .loadConfig[IO, ImovoConfig](
          sharedConfigName = "support-service-lambdas-shared-imovo",
          appIdentity = appIdentity,
        )
        .leftMap(error => DigitalVoucherApiError(error.toString))
      imovoClient <- ImovoClient(backend, imovoConfig)
        .leftMap(error => DigitalVoucherApiError(error.toString))
      routes <- createLogging()(DigitalVoucherApiRoutes(DigitalVoucherService(imovoClient)))
        .asRight[DigitalVoucherApiError]
        .toEitherT[IO]
    } yield routes
  }

  def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CIString => headerKey.toString == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) }),
    )
  }
}
