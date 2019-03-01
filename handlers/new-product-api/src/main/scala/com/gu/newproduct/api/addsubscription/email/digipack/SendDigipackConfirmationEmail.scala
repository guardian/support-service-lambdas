package com.gu.newproduct.api.addsubscription.email.digipack

import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.{DigipackPlanId, Plan, VoucherPlanId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

import scala.concurrent.Future

//todo can we just use the same for paper and digipack ? (and maybe contributions?)
object SendDigipackConfirmationEmail extends Logging {

  def apply(
    etSqsSend: ETPayload[DigipackEmailData] => Future[Unit]
  )(
    sfContactId: Option[SfContactId],
    data: DigipackEmailData
  ): AsyncApiGatewayOp[Unit] = for {
    etPayload <- toPayload(sfContactId, data).toAsync
    sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending paper email sqs message")
  } yield sendMessageResult

  def toPayload(sfContactId: Option[SfContactId], voucherEmailData: DigipackEmailData): ApiGatewayOp[ETPayload[DigipackEmailData]] =
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
      case _: DigipackPlanId => "digipack"
      case _ => "paper-delivery"

    }
  )
}
