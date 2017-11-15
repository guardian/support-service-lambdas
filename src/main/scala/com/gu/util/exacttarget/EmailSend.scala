package com.gu.util.exacttarget

import com.gu.effects.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.zuora.Types.{ ZuoraOp, _ }
import okhttp3.{ MediaType, Request, RequestBody, Response }
import play.api.libs.json.Json

import scalaz.{ -\/, Reader, \/, \/- }

case class ContactAttributesDef(SubscriberAttributes: SubscriberAttributesDef)

case class SubscriberAttributesDef(
  SubscriberKey: String,
  EmailAddress: String,
  subscriber_id: String,
  product: String,
  payment_method: String,
  card_type: String,
  card_expiry_date: String,
  first_name: String,
  last_name: String,
  paymentId: String,
  price: String,
  serviceStartDate: String,
  serviceEndDate: String

)

case class ToDef(Address: String, SubscriberKey: String, ContactAttributes: ContactAttributesDef)

case class Message(To: ToDef, DataExtensionName: String)

case class EmailRequest(attempt: Int, message: Message)

object SubscriberAttributesDef {
  implicit val jf = Json.writes[SubscriberAttributesDef]
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

object EmailClient extends Logging {

  case class HUDeps(buildRequestET: Int => ZuoraOp[Request.Builder])
  val defaultDeps = HUDeps(SalesforceRequestWiring.buildRequestET)

  type SendEmail = EmailRequest => ZuoraOp[Unit] // zuoraop is really an okhttp client plus config

  def sendEmail(deps: HUDeps = defaultDeps): SendEmail = { request =>
    val message = request.message
    // convert message to json and then use it somehow

    ZuoraOp(Reader { zhttp => \/.right(zhttp.isProd): FailableOp[Boolean] }).flatMap { prod =>
      val guardianEmail = request.message.To.Address.endsWith("@guardian.co.uk") || request.message.To.Address.endsWith("@theguardian.com")
      if (!prod && !guardianEmail) {
        logger.warn("not sending email in non prod as it's not a guardian address")
        \/-(()).toZuoraOp
      } else {

        val jsonMT = MediaType.parse("application/json; charset=utf-8")
        val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
        for {
          req <- deps.buildRequestET(request.attempt).leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err"))
          response <- ZuoraOp(Reader { zhttp => \/.right(zhttp.response(req.post(body).build())): FailableOp[Response] })
          result <- (response.code() match {

            case 202 =>
              logger.info(s"send email result ${response.body().string()}")
              \/-(())
            case statusCode =>
              logger.warn(s"email not sent due to $statusCode - ${response.body().string()}")
              -\/(ApiGatewayResponse.internalServerError(s"email not sent due to $statusCode"))
          }).toZuoraOp
        } yield result
      }
    }
  }

}
