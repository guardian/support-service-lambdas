package com.gu.autoCancel

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.ZuoraModels.{ SubscriptionId }
import org.joda.time.LocalDate

object AutoCancel extends Logging {

  def apply(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    for {
      _ <- Zuora.updateCancellationReason(subToCancel).withLogging("updateCancellationReason")
      _ <- Zuora.cancelSubscription(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- Zuora.disableAutoPay(accountId).withLogging("disableAutoPay")
    } yield ()
  }
}
