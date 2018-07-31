package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate
import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Contacts, Email}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.DirectDebit
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json
import scala.concurrent.Future

object contributionEmailRequest {

  case class CurrencyGlyph(value: String) extends AnyVal

  case class Edition(value: String) extends AnyVal

  case class Name(value: String) extends AnyVal //TODO is this first and last name concatenated ?

  case class ContributionsEmailData(
    emailAddress: Email,
    created: LocalDate,
    amount: Int,
    currencyGlyph: CurrencyGlyph,
    edition: Edition,
    name: Name,
    directDebit: Option[DirectDebit]
  )

}

object SendConfirmationEmail extends Logging {

  def getPayload(
    now: LocalDate,
    contacts: Contacts,
    currency: Currency,
    directDebit: Option[DirectDebit],
    amountMinorUnits: Int
  ): AsyncApiGatewayOp[ETPayload] = {
    ETPayload.fromData(amountMinorUnits, now, currency, directDebit, contacts) match {
      case Some(payload) => AsyncApiGatewayOp(ContinueProcessing(payload))
      case None => {
        logger.info("skipping confirmation email, no email address in contact")
        val response = ReturnWithResponse(ApiGatewayResponse.successfulExecution)
        AsyncApiGatewayOp(response)
      }
    }
  }

  def apply(
    now: () => LocalDate,
    sqsSend: Payload => Future[Unit],
    getContacts: ZuoraAccountId => ClientFailableOp[Contacts]
  )(
    accountid: ZuoraAccountId,
    currency: Currency,
    directDebit: Option[DirectDebit],
    amountMinorUnits: Int
  ) = {

    for {
      contacts <- getContacts(accountid).toAsyncApiGatewayOp("getting contacts from Zuora")
      etPayload <- getPayload(now(), contacts, currency, directDebit, amountMinorUnits)
      payloadString = Json.prettyPrint(Json.toJson(etPayload))
      sendMessageResult <- sqsSend(Payload(payloadString)).toAsyncApiGatewayOp("sending sqs message")
    } yield sendMessageResult

  }
}
