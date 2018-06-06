package com.gu.autoCancel

import java.time.LocalDate

import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.gu.util.zuora.{ZuoraCancelSubscription, ZuoraDisableAutoPay, ZuoraUpdateCancellationReason}
import com.gu.util.{Logging, ZuoraToApiGateway}

object AutoCancel extends Logging {

  case class AutoCancelRequest(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate)

  def apply(requests: Requests)(acRequest: AutoCancelRequest): FailableOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    val zuoraOp = for {
      _ <- ZuoraUpdateCancellationReason(requests)(subToCancel).withLogging("updateCancellationReason")
      _ <- ZuoraCancelSubscription(requests)(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- ZuoraDisableAutoPay(requests)(accountId).withLogging("disableAutoPay")
    } yield ()
    zuoraOp.leftMap(ZuoraToApiGateway.fromClientFail)
  }
}
