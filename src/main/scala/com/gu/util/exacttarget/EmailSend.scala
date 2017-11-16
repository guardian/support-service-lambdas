package com.gu.util.exacttarget

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.exacttarget.SalesforceAuthenticate.{ ETImpure, SalesforceAuth }
import com.gu.util.reader.Types._
import com.gu.util.{ ETConfig, Logging }
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

  case class ETS(response: (Request => Response), stage: String, etConfig: ETConfig)

  case class HUDeps(
    sendEmail: (Int, Message) => WithDeps[ETS]#FailableOp[Unit] = sendEmail
  )

  type SendEmail = EmailRequest => WithDeps[ETS]#FailableOp[Unit]

  def apply(deps: HUDeps = HUDeps()): SendEmail = { request =>
    for {
      prod <- Reader { stage: String => \/.right(stage == "PROD"): FailableOp[Boolean] }.toDepsFailableOp.local[ETS](_.stage)
      _ <- filterTestEmail(request.message.To.Address, prod).toReader
      _ <- deps.sendEmail(request.attempt, request.message)
    } yield ()

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

  def sendEmail(attempt: Int, message: Message): WithDeps[ETS]#FailableOp[Unit] = {
    for {
      auth <- SalesforceAuthenticate().toDepsFailableOp.local[ETS](ets => ETImpure(ets.response, ets.etConfig))
      req <- buildRequestET(attempt).toDepsFailableOp.leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err")).local[ETS](e => ETReq(e.etConfig, auth))
      response <- sendEmailOp(req, message).toDepsFailableOp.local[ETS](_.response)
      result <- processResponse(response).toReader
    } yield result
  }

  private def sendEmailOp(req: Request.Builder, message: Message): Reader[Request => Response, FailableOp[Response]] = {
    Reader { response: (Request => Response) =>
      val jsonMT = MediaType.parse("application/json; charset=utf-8")
      val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
      \/.right(response(req.post(body).build())): FailableOp[Response]
    }

  }

  case class ETReq(config: ETConfig, salesforceAuth: SalesforceAuth)

  def buildRequestET(attempt: Int): Reader[ETReq, FailableOp[Request.Builder]] =
    Reader {
      et: ETReq =>
        val builder = new Request.Builder()
          .header("Authorization", s"Bearer ${et.salesforceAuth.accessToken}")
          .url(s"${SalesforceAuthenticate.restEndpoint}/messageDefinitionSends/${et.config.stageETIDForAttempt.etSendKeysForAttempt(attempt)}/send")
        \/.right(builder): FailableOp[Request.Builder]
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
