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
    getCurrentDate: () => LocalDate,
  )(data: VoucherEmailData): AsyncApiGatewayOp[Unit] = {
    val response = for {
      etPayload <- toPayload(data)
      sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending voucher email sqs message")
    } yield sendMessageResult
    response.replace(ContinueProcessing(()))
  }

  def toPayload(voucherEmailData: VoucherEmailData): AsyncApiGatewayOp[ETPayload[VoucherEmailData]] =
    voucherEmailData.contacts.soldTo.email.map { email =>
      val payload = ETPayload(email = email.value, fields = voucherEmailData, DataExtensionName("paper-voucher"))
      ContinueProcessing(payload).toAsync
    }.getOrElse {
      logger.info("No email in zuora contact skipping thank you email")
      ReturnWithResponse(ApiGatewayResponse.successfulExecution).toAsync
    }
}
