package com.gu.util.exacttarget

import com.gu.util.ETConfig.ETSendId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.exacttarget.EmailSendSteps.logger
import com.gu.util.exacttarget.ExactTargetAuthenticate.{ETImpure, SalesforceAuth}
import com.gu.util.reader.Types._
import com.gu.util.{ETConfig, Logging, Stage}
import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json.{Json, Writes, _}
import scalaz.{-\/, \/, \/-}

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
  serviceEndDate: String,
  billing_address1: Option[String] = None,
  billing_address2: Option[String] = None,
  billing_postcode: Option[String] = None,
  billing_city: Option[String] = None,
  billing_state: Option[String] = None,
  billing_country: Option[String] = None,
  title: Option[String] = None
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

    override def writes(o: SubscriberAttributesDef): JsValue = {

      val fields = Map(
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

      val optionalFields = Map(
        "billing_address1" -> o.billing_address1.map(JsString),
        "billing_address2" -> o.billing_address2.map(JsString),
        "billing_postcode" -> o.billing_postcode.map(JsString),
        "billing_city" -> o.billing_city.map(JsString),
        "billing_state" -> o.billing_state.map(JsString),
        "billing_country" -> o.billing_country.map(JsString),
        "title" -> o.title.map(JsString)
      ).collect { case (key, Some(value)) => key -> value }

      val allFields = fields ++ optionalFields
      JsObject(allFields)
    }
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

  def apply(
    sendEmail: EmailRequest => FailableOp[Unit],
    filterEmail: EmailRequest => FailableOp[Unit]
  )(request: EmailRequest): FailableOp[Unit] =
    for {
      _ <- filterEmail(request)
      _ <- sendEmail(request)
    } yield ()

}

object ETClient {

  def sendEmail(
    response: Request => Response,
    etConfig: ETConfig
  )(emailRequest: EmailRequest): FailableOp[Unit] = {
    for {
      auth <- ExactTargetAuthenticate(ETImpure(response, etConfig))
      req <- buildRequestET(ETReq(etConfig, auth))(emailRequest.etSendId)
      response <- sendEmailOp(response)(req, emailRequest.message)
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
      .url(s"${ExactTargetAuthenticate.restEndpoint}/messageDefinitionSends/${eTSendId.id}/send")
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
