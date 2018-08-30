package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate
import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes.AsyncApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.AsyncTypes._

import scala.concurrent.Future

object SendConfirmationEmailVoucher extends Logging {

  def apply(
    etSqsSend: ETPayload[VoucherEmailData] => Future[Unit],
    getCurrentDate: () => LocalDate
  )(data: VoucherEmailData): AsyncApiGatewayOp[Unit] = for {
    etPayload <- toPayload(data)
    sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending voucher email sqs message")
  } yield sendMessageResult

  def toPayload(voucherEmailData: VoucherEmailData): AsyncApiGatewayOp[ETPayload[VoucherEmailData]] =
    voucherEmailData.contacts.soldTo.email.map { email =>
      val payload = ETPayload(email = email.value, fields = voucherEmailData, DataExtensionName("paper-voucher"))
      ContinueProcessing(payload).toAsync
    }.getOrElse {
      val errorLogMessage = "No email address in zuora sold to contact, skipping voucher thank you email"
      logger.warn(errorLogMessage)
      val response = ApiGatewayResponse.messageResponse("500", "Internal server error")
      ReturnWithResponse(response).toAsync
    }
}
