package com.gu.autoCancel

import java.time.LocalDate

import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.gu.util.zuora.{ZuoraCancelSubscription, ZuoraUpdateCancellationReason}

object MultiAutoCancel extends Logging {

  case class AutoCancelRequest(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate)

  def apply(requests: Requests)(acRequests: List[AutoCancelRequest]): ApiGatewayOp[Unit] = {
    val responses = acRequests.map(cancelReq => executeCancel(requests)(cancelReq))
    logger.info(s"AutoCancel requests created: $responses")
    responses.head
  }

  private def executeCancel(requests: Requests)(acRequest: AutoCancelRequest): ApiGatewayOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.id}")
    val zuoraOp = for {
      _ <- ZuoraUpdateCancellationReason(requests)(subToCancel).withLogging("updateCancellationReason")
      _ <- ZuoraCancelSubscription(requests)(subToCancel, cancellationDate).withLogging("cancelSubscription")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }
}
