package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.IO
import cats.implicits._
import com.typesafe.scalalogging.LazyLogging

object SFMoveSubscriptionsService extends LazyLogging {

  def moveSubscription(req: MoveSubscriptionReqBody): EitherT[IO, MoveSubscriptionApiError, MoveSubscriptionRes] = {
    import req._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId SalesForce Contact")
    Either.right(MoveSubscriptionRes("subscription moved successfully")).toEitherT
  }

}
