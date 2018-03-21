package com.gu.autoCancel

import com.gu.util.{Logging, ZuoraToApiGateway}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraModels.SubscriptionId
import java.time.LocalDate

import com.gu.util.zuora.{ZuoraCancelSubscription, ZuoraDeps, ZuoraDisableAutoPay, ZuoraUpdateCancellationReason}

object AutoCancel extends Logging {

  case class AutoCancelRequest(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate)

  def apply(zuoraDeps: ZuoraDeps)(acRequest: AutoCancelRequest): FailableOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    val zuoraOp = for {
      _ <- ZuoraUpdateCancellationReason(subToCancel).withLogging("updateCancellationReason")
      _ <- ZuoraCancelSubscription(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- ZuoraDisableAutoPay(accountId).withLogging("disableAutoPay")
    } yield ()
    zuoraOp.leftMap(ZuoraToApiGateway.fromClientFail).run.run(zuoraDeps)
  }
}
