package com.gu.util.exacttarget

import com.gu.util.ETConfig.ETSendId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.exacttarget.ETClient.ETClientDeps
import com.gu.util.exacttarget.EmailSendSteps.logger
import com.gu.util.exacttarget.SalesforceAuthenticate.{ ETImpure, SalesforceAuth }
import com.gu.util.reader.Types._
import com.gu.util.{ ETConfig, Logging, Stage }
import okhttp3.{ MediaType, Request, RequestBody, Response }
import play.api.libs.json.Json

import scalaz.{ -\/, \/, \/- }

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

case class Message(To: ToDef)

case class EmailRequest(etSendId: ETSendId, message: Message)

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

object EmailSendSteps extends Logging {

  case class EmailSendStepsDeps(
    //    stage: Stage,
    sendEmail: EmailRequest => FailableOp[Unit],
    filterEmail: EmailRequest => FailableOp[Unit]
  )

  // you can make a default ETS from a stage and an ET
  // TODO choose the best implementation for default?
  object EmailSendStepsDeps {
    def default(stage: Stage, response: Request => Response, etConfig: ETConfig): EmailSendStepsDeps = {
      EmailSendStepsDeps(ETClient.sendEmail(ETClientDeps(response, etConfig)), FilterEmail(stage))
    }

    //    def default(stage: Stage, et: ETClientDeps): EmailSendStepsDeps = {
    //      def sendEmailD: (ETSendId, Message) => FailableOp[Unit] = {
    //        Function.untupled((ETClient.sendEmail _).tupled.andThen(_.run.run(et)))
    //      }
    //
    //      val filterEmailD = FilterEmail.apply _
    //      EmailSendStepsDeps(stage, sendEmailD, filterEmailD)
    //    }
  }

  ///todo choose the best implementation for apply/2
  //  def extract[D]: WithDepsFailableOp[D, D] = Reader(identity[D]).toEitherTPureEither
  //
  //  def apply(request: EmailRequest): WithDepsFailableOp[EmailSendStepsDeps, Unit] =
  //    for {
  //      ets <- extract[EmailSendStepsDeps]
  //      _ <- ets.filterEmail(request).local[EmailSendStepsDeps](_.stage)
  //      _ <- ets.sendEmail(request.etSendId, request.message).toEitherTPureReader[EmailSendStepsDeps]
  //    } yield ()

  ///

  def apply(ets: EmailSendStepsDeps)(request: EmailRequest): FailableOp[Unit] =
    for {
      _ <- ets.filterEmail(request)
      _ <- ets.sendEmail(request)
    } yield ()

  ///
  //  def run[D, R](function: D => WithDepsFailableOp[D, R]): WithDepsFailableOp[D, R] =
  //    Reader {
  //      function
  //    }.toEitherTPureEither.flatMap(identity)
  //
  //  def apply2(request: EmailRequest): WithDepsFailableOp[EmailSendStepsDeps, Unit] = {
  //    for {
  //      _ <- run[EmailSendStepsDeps, Unit] {
  //        _.filterEmail(request).local[EmailSendStepsDeps](_.stage)
  //      }
  //      _ <- run[EmailSendStepsDeps, Unit] {
  //        _.sendEmail(request.etSendId, request.message).toEitherTPureReader[EmailSendStepsDeps]
  //      }
  //    } yield ()
  //  }

  ///

}

object ETClient {

  case class ETClientDeps(
    response: (Request => Response),
    etConfig: ETConfig
  )

  def sendEmail(eTClientDeps: ETClientDeps)(emailRequest: EmailRequest): FailableOp[Unit] = {
    for {
      auth <- SalesforceAuthenticate(ETImpure(eTClientDeps.response, eTClientDeps.etConfig))
      req <- buildRequestET(ETReq(eTClientDeps.etConfig, auth))(emailRequest.etSendId) //.toEitherT.leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err")).local[ETClientDeps]
      response <- sendEmailOp(eTClientDeps.response)(req, emailRequest.message) //.toEitherT.local[ETClientDeps](_.response)
      result <- processResponse(response)
    } yield result
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
