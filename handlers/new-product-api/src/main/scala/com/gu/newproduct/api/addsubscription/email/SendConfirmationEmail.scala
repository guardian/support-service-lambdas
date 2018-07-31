package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.DirectDebit
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

import scala.concurrent.Future

object SendConfirmationEmail extends Logging {

  def getPayload(
    now: LocalDate,
    billTo: Contact,
    currency: Currency,
    directDebit: Option[DirectDebit],
    amountMinorUnits: Int
  ): AsyncApiGatewayOp[ETPayload[ContributionFields]] = {
    val maybeContributionFields = ContributionFields.fromData(amountMinorUnits, now, currency, directDebit, billTo)

    maybeContributionFields.map { fields =>
      val payload = ETPayload(fields.EmailAddress, fields)
      AsyncApiGatewayOp(ContinueProcessing(payload))
    }.getOrElse {
      logger.info("Not enough data in zuora account to send contribution thank you email, skipping")
      AsyncApiGatewayOp(ReturnWithResponse(ApiGatewayResponse.successfulExecution))
    }
  }

  def apply(
    now: () => LocalDate,
    sqsSend: Payload => Future[Unit],
    getBillTo: ZuoraAccountId => ClientFailableOp[Contact]
  )(
    accountid: ZuoraAccountId,
    currency: Currency,
    directDebit: Option[DirectDebit],
    amountMinorUnits: Int
  ) = {

    val response = for {
      billTo <- getBillTo(accountid).toAsyncApiGatewayOp("getting billTo contact from Zuora")
      etPayload <- getPayload(now(), billTo, currency, directDebit, amountMinorUnits)
      payloadString = Json.prettyPrint(Json.toJson(etPayload))
      sendMessageResult <- sqsSend(Payload(payloadString)).toAsyncApiGatewayOp("sending sqs message")
    } yield sendMessageResult

    response.replace(ContinueProcessing(()))

  }
}
