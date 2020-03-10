package com.gu.sf.move.subscriptions.api

import cats.effect.Effect
import cats.implicits._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityDecoder._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.Http4sDsl
import org.http4s.{DecodeFailure, HttpRoutes, Request, Response}

object SFMoveSubscriptionsApiRoutes extends LazyLogging {

  def apply[F[_]: Effect](moveSubscriptionService: SFMoveSubscriptionsService[F]): HttpRoutes[F] = {
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    val rootInfo = MoveSubscriptionApiRoot("This is the sf-move-subscriptions-api")

    def handleMoveRequest(request: Request[F]): F[Response[F]] = {
      (for {
        reqBody <- request.attemptAs[MoveSubscriptionData]
          .leftMap { decodingFailure: DecodeFailure =>
            BadRequest(MoveSubscriptionApiError(s"Failed to decoded request body: $decodingFailure"))
          }
        resp <- moveSubscriptionService.moveSubscription(reqBody)
          .leftMap(
            error =>
              InternalServerError(MoveSubscriptionApiError(s"Failed to move subscription: $error"))
          )
      } yield Ok(resp)).merge.flatten
    }

    HttpRoutes.of[F] {
      case GET -> Root => Ok(rootInfo)
      case request @ POST -> Root / "subscription" / "move" =>
        handleMoveRequest(request)
    }
  }
}
