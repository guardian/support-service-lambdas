package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ToMessage
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.EmailConfig.EmailSendIds
import com.gu.util.email.EmailMessage
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json._
object AutoCancelSteps extends Logging {

  case class AutoCancelUrlParams(onlyCancelDirectDebit: Boolean)

  object AutoCancelUrlParams {

    case class UrlParamsWire(onlyCancelDirectDebit: Option[String]) {
      def toAutoCancelUrlParams = AutoCancelUrlParams(onlyCancelDirectDebit.contains("true"))
    }

    val wireReads = Json.reads[UrlParamsWire]
    implicit val autoCancelUrlParamsReads: Reads[AutoCancelUrlParams] = json => wireReads.reads(json).map(_.toAutoCancelUrlParams)
  }

  def apply(
    autoCancel: AutoCancelRequest => ApiGatewayOp[Unit],
    autoCancelFilter: AutoCancelCallout => ApiGatewayOp[AutoCancelRequest],
    etSendIds: EmailSendIds,
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailMessage) => ApiGatewayOp[Unit]
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    (for {
      autoCancelCallout <- apiGatewayRequest.bodyAsCaseClass[AutoCancelCallout]()
      urlParams <- apiGatewayRequest.queryParamsAsCaseClass[AutoCancelUrlParams]()
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = urlParams.onlyCancelDirectDebit)
      acRequest <- autoCancelFilter(autoCancelCallout).withLogging(s"auto-cancellation filter for ${autoCancelCallout.accountId}")
      _ <- autoCancel(acRequest).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      request <- makeRequest(etSendIds, autoCancelCallout)
      _ <- sendEmailRegardingAccount(autoCancelCallout.accountId, request)
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def makeRequest(emailSendIds: EmailSendIds, autoCancelCallout: AutoCancelCallout): ApiGatewayOp[PaymentFailureInformation => EmailMessage] = {
    ContinueProcessing({ pFI: PaymentFailureInformation => ToMessage(autoCancelCallout, pFI, emailSendIds.cancelled) })

  }

}
