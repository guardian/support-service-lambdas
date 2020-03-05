package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityDecoder._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.io._
import org.http4s.{HttpRoutes, Request}

object SFMoveSubscriptionsApiRoutes extends LazyLogging {

  def apply(): HttpRoutes[IO] = {

    val rootInfo = Map(
      "description" -> "This is the sf-move-subscriptions-api"
    )

    def handleMoveRequest(request: Request[IO]) = {
      for {
        req <- request.as[MoveSubscriptionReqBody]
        _ <- Ok(SFMoveSubscriptionsService.moveSubscription(req))
        resp <- Ok(SubscriptionMoved("subscription moved successfully"))
      } yield resp
    }

    HttpRoutes.of[IO] {
      case GET -> Root => Ok(rootInfo)
      case request@POST -> Root / "subscription" / "move" => handleMoveRequest(request)
    }

  }

}
