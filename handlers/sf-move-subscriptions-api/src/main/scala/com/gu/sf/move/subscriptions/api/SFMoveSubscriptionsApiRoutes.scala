package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityDecoder._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.io._
import org.http4s.{DecodeFailure, HttpRoutes, Request}

object SFMoveSubscriptionsApiRoutes extends LazyLogging {

  def apply(): HttpRoutes[IO] = {

    val rootInfo = MoveSubscriptionApiRoot("This is the sf-move-subscriptions-api")

    def handleMoveRequest(request: Request[IO]) = {
      (for {
        reqBody <- request.attemptAs[MoveSubscriptionReqBody]
          .leftMap { decodingFailure: DecodeFailure =>
            BadRequest(MoveSubscriptionApiError(s"Failed to decoded request body: $decodingFailure"))
          }
        resp <- SFMoveSubscriptionsService.moveSubscription(reqBody)
          .leftMap(
            error =>
              InternalServerError(MoveSubscriptionApiError(s"Failed create voucher: $error"))
          )
      } yield Ok(resp)).merge.flatMap(x => x)
    }

    HttpRoutes.of[IO] {
      case GET -> Root => Ok(rootInfo)
      case request@POST -> Root / "subscription" / "move" =>
        handleMoveRequest(request)
    }

  }

}
