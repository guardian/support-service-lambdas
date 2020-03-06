package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import com.typesafe.scalalogging.LazyLogging

trait SFMoveSubscriptionsService[F[_]] {
  def moveSubscription(req: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionApiError, MoveSubscriptionRes]
}

object SFMoveSubscriptionsService extends LazyLogging {

  def apply[F[_] : Monad](): SFMoveSubscriptionsService[F] = new SFMoveSubscriptionsService[F] {
    override def moveSubscription(req: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionApiError, MoveSubscriptionRes] = {
      import req._
      logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId , $sfFullContactId SalesForce Contact")
      EitherT.rightT(MoveSubscriptionRes("subscription moved successfully"))
    }
  }

}
