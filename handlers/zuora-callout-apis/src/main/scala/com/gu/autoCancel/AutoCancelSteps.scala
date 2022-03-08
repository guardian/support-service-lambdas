package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ToMessage
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.email.{EmailId, EmailMessage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}
import play.api.libs.json._

object AutoCancelSteps extends Logging {

  case class AutoCancelUrlParams(onlyCancelDirectDebit: Boolean, dryRun: Boolean)

  object AutoCancelUrlParams {

    case class UrlParamsWire(onlyCancelDirectDebit: Option[String], dryRun: Option[String]) {
      def toAutoCancelUrlParams = AutoCancelUrlParams(
        onlyCancelDirectDebit.contains("true"), dryRun.contains("true")
      )
    }

    val wireReads = Json.reads[UrlParamsWire]
    implicit val autoCancelUrlParamsReads: Reads[AutoCancelUrlParams] = json => wireReads.reads(json).map(_.toAutoCancelUrlParams)
  }

  /*
   * This process applies at the invoice level.
   * Each invoice can have multiple invoice items applying to a different subscription.
   */
  def apply(
    callZuoraAutoCancel: (List[AutoCancelRequest], AutoCancelUrlParams) => ApiGatewayOp[Unit],
    autoCancelReqProducer: AutoCancelCallout => ApiGatewayOp[List[AutoCancelRequest]],
    sendEmailRegardingAccount: (String, PaymentFailureInformation => Either[String, EmailMessage]) => ClientFailableOp[Unit]
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    (for {
      autoCancelCallout <- apiGatewayRequest.bodyAsCaseClass[AutoCancelCallout]()
      urlParams <- apiGatewayRequest.queryParamsAsCaseClass[AutoCancelUrlParams]()
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = urlParams.onlyCancelDirectDebit)
      autoCancelRequests <- autoCancelReqProducer(autoCancelCallout).withLogging(s"auto-cancellation requests for ${autoCancelCallout.accountId}")
      _ <- callZuoraAutoCancel(autoCancelRequests, urlParams).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      request = makeRequest(autoCancelCallout) _
      _ <- handleSendPaymentFailureEmail(autoCancelCallout.accountId, request, sendEmailRegardingAccount, urlParams)
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def makeRequest(autoCancelCallout: AutoCancelCallout)(paymentFailureInformation: PaymentFailureInformation): Either[String, EmailMessage] =
    ToMessage(autoCancelCallout, paymentFailureInformation, EmailId.cancelledId)

  private def handleSendPaymentFailureEmail(
    accountId: String,
    request: PaymentFailureInformation => Either[String, EmailMessage],
    sendEmailRegardingAccount: (String, PaymentFailureInformation => Either[String, EmailMessage]) => ClientFailableOp[Unit],
    urlParams: AutoCancelUrlParams
  ) = {
    if (urlParams.dryRun) {
      val msg = "DryRun of SendPaymentFailureEmail"
      logger.info(msg)
      ContinueProcessing(())
    } else logErrorsAndContinueProcessing(sendEmailRegardingAccount(accountId, request))
  }

  private def logErrorsAndContinueProcessing(clientFailableOp: ClientFailableOp[Unit]): ContinueProcessing[Unit] = clientFailableOp match {
    case e: ClientFailure =>
      logger.warn(s"ignored error: ${e.message}")
      ContinueProcessing(())
    case ClientSuccess(()) => ContinueProcessing(())
  }
}
