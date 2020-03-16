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

    val selfDoc = MoveSubscriptionApiRoot(
      description = "This is the sf-move-subscriptions-api",
      exampleRequests = List(
        ExampleReqDoc(
          method = "POST",
          path = "subscription/move",
          body = MoveSubscriptionReqBody(
            zuoraSubscriptionId = "Zuora Subscription Id",
            sfAccountId = "SF Account Id",
            sfFullContactId = "SF Full contact Id",
            identityId = "id from guardian identity service, if not set in SF send blank value (empty string)"
          )
        )
      )
    )

    def handleMoveRequest(request: Request[F], dryRun: Boolean = false): F[Response[F]] = {
      (for {
        reqBody <- request.attemptAs[MoveSubscriptionReqBody]
          .leftMap { decodingFailure: DecodeFailure =>
            BadRequest(MoveSubscriptionApiError(s"Failed to decoded request body: $decodingFailure"))
          }
        resp <- moveSubscriptionService.moveSubscription(reqBody, dryRun)
          .bimap(
            err => InternalServerError(MoveSubscriptionApiError(err.toString)),
            res => Ok(MoveSubscriptionApiSuccess(res.message))
          )
      } yield resp).merge.flatten
    }

    HttpRoutes.of[F] {
      case GET -> Root => Ok(selfDoc)
      case request @ POST -> Root / "subscription" / "move" =>
        handleMoveRequest(request)
      case request @ POST -> Root / "subscription" / "move" / "dry-run" =>
        handleMoveRequest(request, dryRun = true)
    }
  }
}
