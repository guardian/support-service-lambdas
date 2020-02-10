package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

final case class DigitalVoucherApiAppError(message: String)

object DigitalVoucherApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(appIdentity: AppIdentity): EitherT[IO, DigitalVoucherApiAppError, HttpRoutes[IO]] = {
    for {
      config <- ConfigLoader.loadConfig[IO](appIdentity: AppIdentity).leftMap(error => DigitalVoucherApiAppError(error.toString))
      _ = logger.info(s"Loaded config: ${config.imovoBaseUrl}") //Temporary log message to check config is loaded
      routes <- EitherT.rightT[IO, DigitalVoucherApiAppError](createLogging()(DigitalVoucherApiRoutes(DigitalVoucherService())))
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

  private val bucket = "gu-reader-revenue-private"
}
