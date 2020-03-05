package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes

final case class SFMoveSubscriptionsApiError(message: String)

object SFMoveSubscriptionsApiApp extends LazyLogging {

  //  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(): HttpRoutes[IO] = {
    logger.info("Starting sf-move-subscriptions-api lambda")

    SFMoveSubscriptionsApiRoutes.apply()
  }

}
