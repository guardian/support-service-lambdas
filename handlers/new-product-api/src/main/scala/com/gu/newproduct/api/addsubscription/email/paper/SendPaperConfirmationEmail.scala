package com.gu.newproduct.api.addsubscription.email.paper

import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.{Plan, VoucherPlanId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

import scala.concurrent.Future

object SendPaperConfirmationEmail extends Logging {

  def apply(
    etSqsSend: ETPayload[PaperEmailData] => Future[Unit]
  )(
    sfContactId: Option[SfContactId],
    data: PaperEmailData
  ): AsyncApiGatewayOp[Unit] = for {
    etPayload <- toPayload(sfContactId, data).toAsync
    sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending paper email sqs message")
  } yield sendMessageResult

  def toPayload(sfContactId: Option[SfContactId], voucherEmailData: PaperEmailData): ApiGatewayOp[ETPayload[PaperEmailData]] =
    voucherEmailData.contacts.soldTo.email match {
      case Some(email) =>
        val payload = ETPayload(
          email = email.value,
          fields = voucherEmailData,
          dataExtensionFor(voucherEmailData.plan),
          sfContactId.map(_.value)
        )
        ContinueProcessing(payload)
      case None =>
        val errorLogMessage = "No email address in zuora sold to contact, skipping paper email thank you email"
        logger.warn(errorLogMessage)
        val response = ApiGatewayResponse.messageResponse("500", "Internal server error")
        ReturnWithResponse(response)
    }

  //todo see if we can pass something like a PaperPlanId here so we can match more specifically
  def dataExtensionFor(plan: Plan) = DataExtensionName(
    plan.id match {
      case _: VoucherPlanId => "paper-voucher"
      case _ => "paper-delivery"
    }
  )
}
