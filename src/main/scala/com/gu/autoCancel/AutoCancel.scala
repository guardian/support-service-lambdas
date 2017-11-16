package com.gu.autoCancel

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.Zuora.{ CancelSubscription, DisableAutoPay, UpdateCancellationReason }
import com.gu.util.zuora.ZuoraModels.SubscriptionId
import org.joda.time.LocalDate

object AutoCancel extends Logging {

  case class ACDeps(
    updateCancellationReason: UpdateCancellationReason = Zuora.updateCancellationReason,
    cancelSubscription: CancelSubscription = Zuora.cancelSubscription,
    disableAutoPay: DisableAutoPay = Zuora.disableAutoPay
  )

  def apply(deps: ACDeps = ACDeps())(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    for {
      _ <- deps.updateCancellationReason(subToCancel).withLogging("updateCancellationReason")
      _ <- deps.cancelSubscription(subToCancel, cancellationDate).withLogging("cancelSubscription")
      _ <- deps.disableAutoPay(accountId).withLogging("disableAutoPay")
    } yield ()
  }
}
