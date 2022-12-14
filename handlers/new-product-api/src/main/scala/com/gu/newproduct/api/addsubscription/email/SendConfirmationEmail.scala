package com.gu.newproduct.api.addsubscription.email

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

import scala.concurrent.Future

object SendConfirmationEmail extends Logging {

  def apply[DATA <: EmailData](
      etSqsSend: ETPayload[DATA] => Future[Unit],
  )(
      sfContactId: Option[SfContactId],
      data: DATA,
  ): AsyncApiGatewayOp[Unit] = for {
    etPayload <- toPayload(sfContactId, data).toAsync
    sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending email sqs message")
  } yield sendMessageResult

  def toPayload[DATA <: EmailData](sfContactId: Option[SfContactId], emailData: DATA): ApiGatewayOp[ETPayload[DATA]] =
    emailData.contacts.billTo.email match {
      case Some(email) =>
        val payload = ETPayload(
          email = email.value,
          fields = emailData,
          dataExtensionFor(emailData.plan),
          sfContactId.map(_.value),
        )
        ContinueProcessing(payload)
      case None =>
        val errorLogMessage = "No email address in zuora contact, skipping confirmation email"
        logger.warn(errorLogMessage)
        val response = ApiGatewayResponse.messageResponse("500", "Internal server error")
        ReturnWithResponse(response)
    }

  def dataExtensionFor(plan: Plan) = DataExtensionName(
    plan.id match {
      case _: DigitalVoucherPlanId => "paper-subscription-card" // SV_SC_WelcomeDay0
      case _: VoucherPlanId => "paper-voucher"
      case _: DigipackPlanId => "digipack"
      case _: SupporterPlusPlanId => "supporter-plus"
      case _: ContributionPlanId => "regular-contribution-thank-you"
      case _: HomeDeliveryPlanId => "paper-delivery"
      case _: GuardianWeeklyDomestic => "guardian-weekly"
      case _: GuardianWeeklyRow => "guardian-weekly"
    },
  )
}
