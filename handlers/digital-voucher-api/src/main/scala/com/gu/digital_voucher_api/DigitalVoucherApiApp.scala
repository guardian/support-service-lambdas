package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

final case class DigitalVoucherApiAppError(message: String)

object DigitalVoucherApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply[S](): EitherT[IO, DigitalVoucherApiAppError, HttpRoutes[IO]] = {
    EitherT.rightT(createLogging()(DigitalVoucherApiRoutes(DigitalVoucherService())))
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
