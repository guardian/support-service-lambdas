package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

import scala.concurrent.Future

object SendConfirmationEmailVoucher extends Logging {

  def apply(
    etSqsSend: ETPayload[VoucherEmailData] => Future[Unit],
    getCurrentDate: () => LocalDate
  )(sfContactId: Option[SfContactId],
    data: VoucherEmailData
  ): AsyncApiGatewayOp[Unit] = for {
    etPayload <- toPayload(sfContactId, data).toAsync
    sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending voucher email sqs message")
  } yield sendMessageResult

  def toPayload(sfContactId: Option[SfContactId], voucherEmailData: VoucherEmailData): ApiGatewayOp[ETPayload[VoucherEmailData]] =
    voucherEmailData.contacts.soldTo.email match {
      case Some(email) =>
        val payload = ETPayload(
          email = email.value,
          fields = voucherEmailData,
          DataExtensionName("paper-voucher"),
          sfContactId.map(_.value)
        )
        ContinueProcessing(payload)
      case None =>
        val errorLogMessage = "No email address in zuora sold to contact, skipping voucher thank you email"
        logger.warn(errorLogMessage)
        val response = ApiGatewayResponse.messageResponse("500", "Internal server error")
        ReturnWithResponse(response)
    }
}
