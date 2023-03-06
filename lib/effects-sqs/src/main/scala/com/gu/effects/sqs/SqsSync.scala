package com.gu.effects.sqs

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.sqs.SqsClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, SendMessageRequest}

import scala.util.{Failure, Success, Try}

/** Manages synchronous access to SQS queues.
  */
object SqsSync extends LazyLogging {

  def buildClient: SqsClient = SqsClient.builder
    .region(EU_WEST_1)
    .credentialsProvider(AwsSQSSend.CredentialsProvider)
    .build()

  def send(client: SqsClient)(queueName: QueueName)(payload: Payload): Try[Unit] = {

    val queueUrl = client
      .getQueueUrl(
        GetQueueUrlRequest.builder.queueName(queueName.value).build(),
      )
      .queueUrl

    logger.info(s"Sending message to SQS queue $queueUrl")

    val request = SendMessageRequest.builder.queueUrl(queueUrl).messageBody(payload.value).build()
    val response = Try(client.sendMessage(request))
    response match {
      case Success(result) =>
        logger.info(s"Successfully sent message to $queueUrl: $result")
        Success(())
      case Failure(throwable) =>
        logger.error(s"Failed to send message to $queueUrl due to:", throwable)
        Failure(throwable)
    }
  }
}
