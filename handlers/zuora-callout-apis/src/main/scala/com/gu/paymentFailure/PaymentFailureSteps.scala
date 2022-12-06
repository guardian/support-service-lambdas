package com.gu.paymentFailure

import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.util.TypeConvert.TypeConvertClientOp
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.Auth.{TrustedApiConfig, validTenant}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.email.{EmailId, EmailMessage}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError, UnderlyingOps}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.AccountId
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}, billingDetails: ${callout.billingDetails}"
  }

  def apply(
    sendEmailRegardingAccount: (String, PaymentFailureInformation => Either[String, EmailMessage]) => ClientFailableOp[Unit],
    trustedApiConfig: TrustedApiConfig
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>

    (for {
      paymentFailureCallout <- apiGatewayRequest.bodyAsCaseClass[PaymentFailureCallout]()
      _ <- paymentFailureCallout.email.toApiGatewayContinueProcessing(noEmailResponse(paymentFailureCallout.accountId))
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- validateTenantCallout(trustedApiConfig)(paymentFailureCallout.tenantId)
      paymentFailureInformationToEmail = makeEmailMessage(paymentFailureCallout) _
      _ <- sendEmailRegardingAccount(paymentFailureCallout.accountId, paymentFailureInformationToEmail).toApiGatewayOp(error => ApiGatewayResponse.messageResponse("500", error.message))
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def makeEmailMessage(
    paymentFailureCallout: PaymentFailureCallout
  )(pFI: PaymentFailureInformation): Either[String, EmailMessage] = for {
    emailSendId <- EmailId.paymentFailureId(paymentFailureCallout.failureNumber)
    emailMessage <- ToMessage(paymentFailureCallout, pFI, emailSendId)
  } yield emailMessage

  def validateTenantCallout(trustedApiConfig: TrustedApiConfig)(calloutTenantId: String): ApiGatewayOp[Unit] = {
    if (validTenant(trustedApiConfig, calloutTenantId)) ContinueProcessing(()) else ReturnWithResponse(unauthorized)
  }

  def noEmailResponse(accountId: String) = {
    logger.warn(s"No email address provided for account $accountId, skipping execution and returning success")
    ApiGatewayResponse.messageResponse("200", "Email address not provided, email will not be sent")
  }
}

object ZuoraEmailSteps {

  def sendEmailRegardingAccount(
    sendEmail: EmailMessage => ClientFailableOp[Unit],
    getInvoiceTransactions: String => ClientFailableOp[InvoiceTransactionSummary]
  )(accountId: String, toMessage: PaymentFailureInformation => Either[String, EmailMessage]): ClientFailableOp[Unit] = {
    for {
      invoiceTransactionSummary <- getInvoiceTransactions(accountId)
      paymentInformation <- GetPaymentData(accountId)(invoiceTransactionSummary).left.map(GenericError(_)).toClientFailableOp
      message <- toMessage(paymentInformation).left.map(GenericError(_)).toClientFailableOp
      _ <- sendEmail(message).withAmendedError(oldError => GenericError(s"email not sent for account ${accountId}, error: ${oldError.message}"))
    } yield ()
  }

}
