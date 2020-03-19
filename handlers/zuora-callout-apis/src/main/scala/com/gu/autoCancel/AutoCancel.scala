package com.gu.autoCancel

import java.time.LocalDate

import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.gu.util.zuora.{ZuoraCancelSubscription, ZuoraDisableAutoPay, ZuoraUpdateCancellationReason}

object AutoCancel extends Logging {

  case class AutoCancelRequest(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate)

  def apply(requests: Requests)(acRequests: List[AutoCancelRequest]): ApiGatewayOp[Unit] = {
    acRequests.map(r => cancel(requests)(r)).head
  }

  private def cancel(requests: Requests)(acRequest: AutoCancelRequest) = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    val zuoraOp = for {
      _ <- ZuoraUpdateCancellationReason(requests)(subToCancel).withLogging("updateCancellationReason")
      _ <- ZuoraCancelSubscription(requests)(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- ZuoraDisableAutoPay(requests)(accountId).withLogging("disableAutoPay")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }
}
