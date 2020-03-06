package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString
import com.gu.AppIdentity

final case class SFMoveSubscriptionsApiError(message: String)

object SFMoveSubscriptionsApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(appIdentity: AppIdentity) = {
    createLogging()(SFMoveSubscriptionsApiRoutes())
  }

  private def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CaseInsensitiveString => headerKey.value == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) })
    )
  }
}
