package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ToMessage
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.email.{EmailId, EmailMessage}
import com.gu.util.reader.Types._
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}
import play.api.libs.json._
import scalaz.\/

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
    sendEmailRegardingAccount: (String, PaymentFailureInformation => String \/ EmailMessage) => ClientFailableOp[Unit]
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    (for {
      autoCancelCallout <- apiGatewayRequest.bodyAsCaseClass[AutoCancelCallout]()
      urlParams <- apiGatewayRequest.queryParamsAsCaseClass[AutoCancelUrlParams]()
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = urlParams.onlyCancelDirectDebit)
      acRequest <- autoCancelFilter(autoCancelCallout).withLogging(s"auto-cancellation filter for ${autoCancelCallout.accountId}")
      _ <- autoCancel(acRequest).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      request = makeRequest(autoCancelCallout) _
      _ <- toSuccessApiResponse(sendEmailRegardingAccount(autoCancelCallout.accountId, request))
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def makeRequest(autoCancelCallout: AutoCancelCallout)(pFI: PaymentFailureInformation): String \/ EmailMessage =
    ToMessage(autoCancelCallout, pFI, EmailId.cancelledId)

  def toSuccessApiResponse(clientFailableOp: ClientFailableOp[Unit]): ContinueProcessing[Unit] = clientFailableOp match {
    case e: ClientFailure =>
      logger.warn(s"ignored error: ${e.message}")
      ContinueProcessing(())
    case ClientSuccess(()) => ContinueProcessing(())
  }
}
