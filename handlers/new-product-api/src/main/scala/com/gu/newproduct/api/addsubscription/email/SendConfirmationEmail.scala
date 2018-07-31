package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Contacts, Email}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.DirectDebit
import com.gu.util.Logging
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

import scala.concurrent.{ExecutionContext, Future}
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types.AsyncApiGatewayOp
import play.api.libs.json.Json

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

  def toAsyncApiGatewayOp[A](f: Future[A], action: String)(implicit ec: ExecutionContext): AsyncApiGatewayOp[A] = {
    val futureClientFailable: Future[ClientFailableOp[A]] = f.map(ClientSuccess(_))
    val futureApiGatewayOp = futureClientFailable.map(_.toApiGatewayOp(action))
    AsyncApiGatewayOp(futureApiGatewayOp)
  }

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
  )(implicit ex: ExecutionContext) = {

    for {
      contacts <- getContacts(accountid).toAsyncApiGatewayOp("getting contacts from Zuora")
      etPayload <- getPayload(now(), contacts, currency, directDebit, amountMinorUnits)
      payloadString = Json.prettyPrint(Json.toJson(etPayload))
      a <- toAsyncApiGatewayOp(sqsSend(Payload(payloadString)), "sending sqs message")
    } yield a

  }
}
