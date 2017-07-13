package com.gu.paymentFailure

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.auth.{ AWSCredentialsProviderChain, EnvironmentVariableCredentialsProvider, InstanceProfileCredentialsProvider }
import com.amazonaws.regions.Regions.EU_WEST_1
import com.amazonaws.services.sqs.AmazonSQSClient
import com.amazonaws.services.sqs.model._
import com.gu.autoCancel.Logging
import play.api.libs.json.Json

import scala.util.Try

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

trait QueueClient {
  def sendDataExtensionToQueue(message: Message): Try[SendMessageResult]
}

object SqsClient extends QueueClient with Logging {

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new ProfileCredentialsProvider("membership"),
    new InstanceProfileCredentialsProvider(false),
    new EnvironmentVariableCredentialsProvider()
  )

  private val sqsClient = AmazonSQSClient.builder
    .withCredentials(CredentialsProvider)
    .withRegion(EU_WEST_1)
    .build()

  val queueUrl = sqsClient.createQueue(new CreateQueueRequest("subs-welcome-email")).getQueueUrl

  override def sendDataExtensionToQueue(message: Message): Try[SendMessageResult] = {

    val payload = Json.toJson(message).toString()

    def sendToQueue(msg: String): SendMessageResult = {
      logger.info(s"sending to queue $queueUrl")
      sqsClient.sendMessage(new SendMessageRequest(queueUrl, msg))
    }

    Try(sendToQueue(payload))
  }

}