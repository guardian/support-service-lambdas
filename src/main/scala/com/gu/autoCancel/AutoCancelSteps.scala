package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ToMessage
import com.gu.util.config.ETConfig.ETSendIds
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.exacttarget.EmailRequest
import com.gu.util.reader.Types._
import ApiGatewayOp.ContinueProcessing
import play.api.libs.json._
object AutoCancelSteps extends Logging {

  case class AutoCancelUrlParams(onlyCancelDirectDebit: Boolean)

  object AutoCancelUrlParams {

    case class UrlParamsWire(onlyCancelDirectDebit: String = "false") {
      def toAutoCancelUrlParams = AutoCancelUrlParams(onlyCancelDirectDebit == "true")
    }

    implicit val wireReads = Json.using[Json.WithDefaultValues].reads[UrlParamsWire]

    implicit val autoCancelUrlParamsReads = new Reads[AutoCancelUrlParams] {
      override def reads(json: JsValue): JsResult[AutoCancelUrlParams] = wireReads.reads(json).map(_.toAutoCancelUrlParams)
    }
  }

  def apply(
    autoCancel: AutoCancelRequest => ApiGatewayOp[Unit],
    autoCancelFilter: AutoCancelCallout => ApiGatewayOp[AutoCancelRequest],
    etSendIds: ETSendIds,
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailRequest) => ApiGatewayOp[Unit]
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

  def makeRequest(etSendIds: ETSendIds, autoCancelCallout: AutoCancelCallout): ApiGatewayOp[PaymentFailureInformation => EmailRequest] = {
    ContinueProcessing({ pFI: PaymentFailureInformation => EmailRequest(etSendIds.cancelled, ToMessage(autoCancelCallout, pFI)) })

  }

}
