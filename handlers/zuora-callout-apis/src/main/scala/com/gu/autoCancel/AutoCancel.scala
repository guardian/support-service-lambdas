package com.gu.autoCancel

import java.time.LocalDate

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.gu.util.zuora.{ZuoraCancelSubscription, ZuoraDisableAutoPay, ZuoraUpdateCancellationReason}

object AutoCancel extends Logging {

  case class AutoCancelRequest(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate)

  def apply(requests: Requests)(acRequest: AutoCancelRequest, urlParams: AutoCancelUrlParams): ApiGatewayOp[Unit] = {
    val dryRun = urlParams.dryRun
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.id}")
    val zuoraUpdateCancellationReasonF = if (dryRun) ZuoraUpdateCancellationReason.dryRun(requests) _ else ZuoraUpdateCancellationReason(requests) _
    val zuoraCancelSubscriptionF = if (dryRun) ZuoraCancelSubscription.dryRun(requests) _ else ZuoraCancelSubscription(requests) _
    val zuoraDisableAutoPayF = if (dryRun) ZuoraDisableAutoPay.dryRun(requests) _ else ZuoraDisableAutoPay(requests) _
    val zuoraOp = for {
      _ <- zuoraUpdateCancellationReasonF(subToCancel).withLogging("updateCancellationReason")
      _ <- zuoraCancelSubscriptionF(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- zuoraDisableAutoPayF(accountId).withLogging("disableAutoPay")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }
}
