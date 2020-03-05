package com.gu.sf.move.subscriptions.api

import com.typesafe.scalalogging.LazyLogging

object SFMoveSubscriptionsService extends LazyLogging {

  def moveSubscription(req: MoveSubscriptionReqBody) = {
    import req._
    logger.info(s"attempt to move $zuoraSubscriptionId subscription to $sfContactId SalesForce Contact")
    req
  }

}
