package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import org.http4s.HttpRoutes
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.io._

object SFMoveSubscriptionsApiRoutes {

  def apply(): HttpRoutes[IO] = {

    val rootInfo = Map(
      "description" -> "This is the sf-move-subscriptions-api"
    )

    HttpRoutes.of[IO] {
      case GET -> Root => Ok(rootInfo)
    }

  }

}
