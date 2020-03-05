package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import org.http4s.HttpRoutes
import org.http4s.dsl.io._

object SFMoveSubscriptionsApiRoutes {

  def apply(): HttpRoutes[IO] = {

    HttpRoutes.of[IO] {
      case GET -> Root / "hello" / name => Ok(s"Hello, $name!")
    }
  }

}
