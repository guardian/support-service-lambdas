package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.Effect
import com.typesafe.scalalogging.LazyLogging

object SFMoveSubscriptionsService extends LazyLogging {
  def moveSubscription[F[_]: Effect](req: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionApiError, MoveSubscriptionRes] = {
    import req._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId , $sfFullContactId SalesForce Contact")
    EitherT.rightT(MoveSubscriptionRes("subscription moved successfully"))
  }
}

