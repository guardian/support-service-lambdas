package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ToMessage
import com.gu.util.config.ETConfig.ETSendIds
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.exacttarget.EmailRequest
import com.gu.util.reader.Types._
import scalaz.\/-

object AutoCancelSteps extends Logging {

  def apply(
    autoCancel: AutoCancelRequest => FailableOp[Unit],
    autoCancelFilter2: AutoCancelCallout => FailableOp[AutoCancelRequest],
    etSendIds: ETSendIds,
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailRequest) => FailableOp[Unit]
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    for {
      autoCancelCallout <- apiGatewayRequest.bodyAsCaseClass[AutoCancelCallout]()
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit)
      acRequest <- autoCancelFilter2(autoCancelCallout).withLogging(s"auto-cancellation filter for ${autoCancelCallout.accountId}")
      _ <- autoCancel(acRequest).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      request <- makeRequest(etSendIds, autoCancelCallout)
      _ <- sendEmailRegardingAccount(autoCancelCallout.accountId, request)
    } yield ()
  })

  def makeRequest(etSendIds: ETSendIds, autoCancelCallout: AutoCancelCallout): FailableOp[PaymentFailureInformation => EmailRequest] = {
    \/-({ pFI: PaymentFailureInformation => EmailRequest(etSendIds.cancelled, ToMessage(autoCancelCallout, pFI)) })

  }

}
