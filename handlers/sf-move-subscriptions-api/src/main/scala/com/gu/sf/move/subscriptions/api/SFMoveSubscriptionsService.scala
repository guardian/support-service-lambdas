package com.gu.sf.move.subscriptions.api

import cats.Monad
import cats.data.EitherT
import com.softwaremill.sttp.{Id, SttpBackend}
import com.typesafe.scalalogging.LazyLogging

final case class MoveSubscriptionServiceSuccess(message: String)

class SFMoveSubscriptionsService[F[_] : Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]) extends LazyLogging {
  def moveSubscription(req: MoveSubscriptionReqBody): EitherT[F, MoveSubscriptionApiError, MoveSubscriptionServiceSuccess] = {
    import req._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfAccountId , $sfFullContactId SalesForce Contact")
    EitherT.rightT(MoveSubscriptionServiceSuccess("subscription moved successfully"))
  }
}

object SFMoveSubscriptionsService {
  def apply[F[_] : Monad](apiCfg: MoveSubscriptionApiConfig, backend: SttpBackend[Id, Nothing]): SFMoveSubscriptionsService[F] =
    new SFMoveSubscriptionsService(apiCfg, backend)
}
