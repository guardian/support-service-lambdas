package com.gu.util.exacttarget

import com.gu.util.ETConfig.ETSendId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.exacttarget.ETClient.ETClientDeps
import com.gu.util.exacttarget.EmailSendSteps.logger
import com.gu.util.exacttarget.SalesforceAuthenticate.{ ETImpure, SalesforceAuth }
import com.gu.util.reader.Types._
import com.gu.util.{ ETConfig, Logging, Stage }
import okhttp3.{ MediaType, Request, RequestBody, Response }
import play.api.libs.json.{ Json, Writes, _ }

import scalaz.{ -\/, \/, \/- }

case class ContactAttributesDef(SubscriberAttributes: SubscriberAttributesDef)

case class SubscriberAttributesDef(
  subscriber_id: String,
  product: String,
  payment_method: String,
  card_type: String,
  card_expiry_date: String,
  first_name: String,
  last_name: String,
  primaryKey: PrimaryKey,
  price: String,
  serviceStartDate: String,
  serviceEndDate: String
)

sealed trait PrimaryKey {
  // ET will filter out multiple emails with the same payment id for PF1,2,3,4
  // ET will filter out multiple emails with the same invoice id for overdue 29
}
case class PaymentId(id: String) extends PrimaryKey
case class InvoiceId(id: String) extends PrimaryKey

case class ToDef(Address: String, SubscriberKey: String, ContactAttributes: ContactAttributesDef)

case class Message(To: ToDef)

case class EmailRequest(etSendId: ETSendId, message: Message)

object SubscriberAttributesDef {
  implicit val jf2 = new Writes[SubscriberAttributesDef] {

    override def writes(o: SubscriberAttributesDef): JsValue =
      JsObject(
        fields = Seq[(String, JsValue)](
          "subscriber_id" -> JsString(o.subscriber_id),
          "product" -> JsString(o.product),
          "payment_method" -> JsString(o.payment_method),
          "card_type" -> JsString(o.card_type),
          "card_expiry_date" -> JsString(o.card_expiry_date),
          "first_name" -> JsString(o.first_name),
          "last_name" -> JsString(o.last_name),
          o.primaryKey match {
            case PaymentId(id) => "paymentId" -> JsString(id)
            case InvoiceId(id) => "invoiceId" -> JsString(id)
          },
          "price" -> JsString(o.price),
          "serviceStartDate" -> JsString(o.serviceStartDate),
          "serviceEndDate" -> JsString(o.serviceEndDate)
        )
      )

  }

}

object ContactAttributesDef {
  implicit val jf = Json.writes[ContactAttributesDef]
}

object ToDef {
  implicit val jf = Json.writes[ToDef]
}

object Message {
  implicit val jf = Json.writes[Message]
}

object EmailSendSteps extends Logging {

  case class EmailSendStepsDeps(
    sendEmail: EmailRequest => FailableOp[Unit],
    filterEmail: EmailRequest => FailableOp[Unit]
  )

  object EmailSendStepsDeps {
    def default(stage: Stage, response: Request => Response, etConfig: ETConfig): EmailSendStepsDeps = {
      EmailSendStepsDeps(ETClient.sendEmail(ETClientDeps(response, etConfig)), FilterEmail(stage))
    }

  }

  def apply(ets: EmailSendStepsDeps)(request: EmailRequest): FailableOp[Unit] =
    for {
      _ <- ets.filterEmail(request)
      _ <- ets.sendEmail(request)
    } yield ()

}

object ETClient {

  case class ETClientDeps(
    response: (Request => Response),
    etConfig: ETConfig
  )

  def sendEmail(eTClientDeps: ETClientDeps)(emailRequest: EmailRequest): FailableOp[Unit] = {
    for {
      auth <- SalesforceAuthenticate(ETImpure(eTClientDeps.response, eTClientDeps.etConfig))
      req <- buildRequestET(ETReq(eTClientDeps.etConfig, auth))(emailRequest.etSendId)
      response <- sendEmailOp(eTClientDeps.response)(req, emailRequest.message)
      _ <- processResponse(response)
    } yield ()
  }

  private def sendEmailOp(response: Request => Response)(req: Request.Builder, message: Message): FailableOp[Response] = {
    val jsonMT = MediaType.parse("application/json; charset=utf-8")
    val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
    \/.right(response(req.post(body).build())): FailableOp[Response]

  }

  case class ETReq(config: ETConfig, salesforceAuth: SalesforceAuth)

  def buildRequestET(et: ETReq)(eTSendId: ETSendId): FailableOp[Request.Builder] = {
    val builder = new Request.Builder()
      .header("Authorization", s"Bearer ${et.salesforceAuth.accessToken}")
      .url(s"${SalesforceAuthenticate.restEndpoint}/messageDefinitionSends/${eTSendId.id}/send")
    \/.right(builder): FailableOp[Request.Builder]
  }

  private def processResponse(response: Response): FailableOp[Unit] = {
    response.code() match {
      case 202 =>
        logger.info(s"send email result ${response.body().string()}")
        \/-(())
      case statusCode =>
        logger.warn(s"email not sent due to $statusCode - ${response.body().string()}")
        -\/(ApiGatewayResponse.internalServerError(s"email not sent due to $statusCode"))
    }
  }

}

object FilterEmail {

  def apply(stage: Stage)(request: EmailRequest): FailableOp[Unit] = {
    for {
      prod <- isProd(stage)
      _ <- filterTestEmail(request.message.To.Address, prod)
    } yield ()

  }

  private def isProd(stage: Stage): FailableOp[Boolean] = {
    \/.right(stage.isProd)
  }

  private def filterTestEmail(email: String, prod: Boolean): FailableOp[Unit] = {
    val guardianEmail = email.endsWith("@guardian.co.uk") || email.endsWith("@theguardian.com")
    if (!prod && !guardianEmail) {
      logger.warn("not sending email in non prod as it's not a guardian address")
      -\/(ApiGatewayResponse.successfulExecution)
    } else {
      \/-(())
    }
  }
}
