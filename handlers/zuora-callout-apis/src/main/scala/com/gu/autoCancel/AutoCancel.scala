package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, NotFound}
import com.gu.util.zuora._
import play.api.libs.json.{JsDefined, JsString, JsValue}

import java.time.LocalDate

object AutoCancel extends Logging {

  case class AutoCancelRequest(
    accountId: String,
    subToCancel: SubscriptionNumber,
    cancellationDate: LocalDate,
    invoiceId: String,
    invoiceAmount: BigDecimal
  )

  def apply(requests: Requests)(acRequests: List[AutoCancelRequest], urlParams: AutoCancelUrlParams): ApiGatewayOp[Unit] = {
    logger.info(s"dryRun: ${urlParams.dryRun}")
    val ac = executeCancel(requests, urlParams.dryRun) _
    val responses = acRequests.map(cancelReq => ac(cancelReq))
    logger.info(s"AutoCancel responses: $responses")
    // TODO to refactor it should not call head
    responses.head
  }

  private def findBalancingInvoiceId(cancelSubscriptionResponse: JsValue): ClientFailableOp[String] =
    cancelSubscriptionResponse \ "invoiceId" match {
      case JsDefined(JsString(value)) => ClientSuccess(value)
      case _ => NotFound(s"Subscription cancellation response '$cancelSubscriptionResponse' doesn't contain an invoice ID")
    }

  private def executeCancel(requests: Requests, dryRun: Boolean)(acRequest: AutoCancelRequest): ApiGatewayOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate, invoiceId, invoiceAmount) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.value}")
    val zuoraUpdateCancellationReasonF = if (dryRun) ZuoraUpdateCancellationReason.dryRun(requests) _ else ZuoraUpdateCancellationReason(requests) _
    val zuoraCancelSubscriptionF = if (dryRun) ZuoraCancelSubscription.dryRun(requests) _ else ZuoraCancelSubscription(requests) _
    val zuoraTransferToCreditBalanceF = if (dryRun) TransferToCreditBalance.dryRun(requests) _ else TransferToCreditBalance(requests) _
    val zuoraApplyCreditBalanceF = if (dryRun) ApplyCreditBalance.dryRun(requests) _ else ApplyCreditBalance(requests) _
    val zuoraOp = for {
      _ <- zuoraUpdateCancellationReasonF(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- zuoraCancelSubscriptionF(subToCancel, cancellationDate).withLogging("cancelSubscription")
      balancingInvoiceId <- findBalancingInvoiceId(cancellationResponse)
      _ <- zuoraTransferToCreditBalanceF(balancingInvoiceId, invoiceAmount, "Auto-cancellation").withLogging("transferToCreditBalance")
      _ <- zuoraApplyCreditBalanceF(invoiceId, invoiceAmount, "Auto-cancellation").withLogging("applyCreditBalance")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }
}
