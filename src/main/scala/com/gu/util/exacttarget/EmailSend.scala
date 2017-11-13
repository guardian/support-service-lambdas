package com.gu.util.exacttarget

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.Types.{ ZuoraOp, ZuoraReader }
import okhttp3.{ MediaType, RequestBody }
import play.api.libs.json.Json

import scalaz.{ -\/, EitherT, Reader, \/- }

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

  type SendDataExtensionToQueue = EmailRequest => ZuoraOp[Unit] // zuoraop is really an okhttp client plus config

  def sendDataExtensionToQueue: SendDataExtensionToQueue = { request =>
    EitherT[ZuoraReader, ApiResponse, Unit](Reader { zhttp =>
      val message = request.message
      // convert message to json and then use it somehow

      val jsonMT = MediaType.parse("application/json; charset=utf-8")
      val body = RequestBody.create(jsonMT, Json.stringify(Json.toJson(message)))
      for {
        req <- zhttp.buildRequestET(request.attempt).leftMap(err => ApiGatewayResponse.internalServerError(s"oops todo because: $err"))
        response = zhttp.response(req.post(body).build())
        result <- response.code() match {

          case 202 =>
            logger.info(s"send email result ${response.body().string()}")
            \/-(())
          case statusCode =>
            logger.warn(s"email not sent due to $statusCode - ${response.body().string()}")
            -\/(ApiGatewayResponse.internalServerError(s"email not sent due to $statusCode"))
        }
      } yield result
    })
  }

}

//trait QueueClient {
//  def sendDataExtensionToQueue(message: Message): Try[SendMessageResult]
//}
//
//object SqsClient extends QueueClient with Logging {
//
//  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
//    new ProfileCredentialsProvider("membership"),
//    new InstanceProfileCredentialsProvider(false),
//    new EnvironmentVariableCredentialsProvider()
//  )
//
//  private val sqsClient = AmazonSQSClient.builder
//    .withCredentials(CredentialsProvider)
//    .withRegion(EU_WEST_1)
//    .build()
//
//  val queueUrl = sqsClient.createQueue(new CreateQueueRequest("subs-welcome-email")).getQueueUrl
//
//  override def sendDataExtensionToQueue(message: Message): Try[SendMessageResult] = {
//
//    val payload = Json.toJson(message).toString()
//
//    def sendToQueue(msg: String): SendMessageResult = {
//      logger.info(s"sending to queue $queueUrl")
//      sqsClient.sendMessage(new SendMessageRequest(queueUrl, msg))
//    }
//
//    Try(sendToQueue(payload))
//  }
//
//}