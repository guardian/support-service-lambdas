package com.gu.util.exacttarget

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.{ Config, ETConfig, Logging }
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

  case class HUDeps(buildRequestET: Int => et#ImpureFunctionsFailableOp[Request.Builder] = SalesforceRequestWiring.buildRequestET)

  type SendEmail = EmailRequest => et#ImpureFunctionsFailableOp[Unit] // zuoraop is really an okhttp client plus config

  def apply(deps: HUDeps = HUDeps()): SendEmail = { request =>
    for {
      prod <- ImpureFunctionsFailableOp(Reader { configHttp: HttpAndConfig[ETConfig] => \/.right(configHttp.isProd): FailableOp[Boolean] })
      _ <- filterTestEmail(request.message.To.Address, prod).toConfigHttpFailableOp
      req <- deps.buildRequestET(request.attempt).leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err"))
      response <- sendEmailOp(req, request.message).local[HttpAndConfig[ETConfig]](_.response)
      result <- processResponse(response).toConfigHttpFailableOp
    } yield result

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

  private def sendEmailOp(req: Request.Builder, message: Message): http#ImpureFunctionsFailableOp[Response] = {
    ImpureFunctionsFailableOp(Reader { response: (Request => Response) =>
      val jsonMT = MediaType.parse("application/json; charset=utf-8")
      val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
      \/.right(response(req.post(body).build())): FailableOp[Response]
    })

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
