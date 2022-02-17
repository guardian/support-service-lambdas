package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import cats.syntax.all._
import com.gu.AppIdentity
import com.gu.util.config.ConfigLoader
import sttp.client3.{Identity, SttpBackend}
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import io.circe.generic.auto._
import org.typelevel.ci.CIString

final case class MoveSubscriptionApiError(message: String)

final case class MoveSubscriptionApiSuccess(message: String)

object SFMoveSubscriptionsApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(appIdentity: AppIdentity, backend: SttpBackend[Identity, Any]): EitherT[IO, MoveSubscriptionApiError, HttpRoutes[IO]] = {
    for {
      apiConfig <- ConfigLoader.loadConfig[IO, MoveSubscriptionApiConfig](appIdentity)
        .leftMap(error => MoveSubscriptionApiError(error.toString))
      routes <- createLogging()(SFMoveSubscriptionsApiRoutes(SFMoveSubscriptionsService(apiConfig, backend)))
        .asRight[MoveSubscriptionApiError]
        .toEitherT[IO]
    } yield routes
  }

  private def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CIString => headerKey.toString == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) })
    )
  }
}
