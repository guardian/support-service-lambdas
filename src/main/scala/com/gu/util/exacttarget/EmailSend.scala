package com.gu.util.exacttarget

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.{ ConfigHttpFailableOp, _ }
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

object EmailSend extends Logging {

  // don't really need a full ConfigHttp, maybe we can reduce the deps?
  case class HUDeps(buildRequestET: Int => ConfigHttpFailableOp[Request.Builder] = SalesforceRequestWiring.buildRequestET)

  type SendEmail = EmailRequest => ConfigHttpFailableOp[Unit] // zuoraop is really an okhttp client plus config

  def apply(deps: HUDeps = HUDeps()): SendEmail = { request =>
    val message = request.message
    // convert message to json and then use it somehow

    ConfigHttpFailableOp(Reader { configHttp => \/.right(configHttp.isProd): FailableOp[Boolean] }).flatMap { prod =>
      val guardianEmail = request.message.To.Address.endsWith("@guardian.co.uk") || request.message.To.Address.endsWith("@theguardian.com")
      if (!prod && !guardianEmail) {
        logger.warn("not sending email in non prod as it's not a guardian address")
        \/-(()).toConfigHttpFailableOp
      } else {

        val jsonMT = MediaType.parse("application/json; charset=utf-8")
        val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
        for {
          req <- deps.buildRequestET(request.attempt).leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err"))
          response <- ConfigHttpFailableOp(Reader { configHttp => \/.right(configHttp.response(req.post(body).build())): FailableOp[Response] })
          result <- (response.code() match {

            case 202 =>
              logger.info(s"send email result ${response.body().string()}")
              \/-(())
            case statusCode =>
              logger.warn(s"email not sent due to $statusCode - ${response.body().string()}")
              -\/(ApiGatewayResponse.internalServerError(s"email not sent due to $statusCode"))
          }).toConfigHttpFailableOp
        } yield result
      }
    }
  }

}
