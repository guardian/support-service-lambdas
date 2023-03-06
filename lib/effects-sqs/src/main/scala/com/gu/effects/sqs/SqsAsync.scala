package com.gu.effects.sqs

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, SendMessageRequest}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.jdk.FutureConverters._
import scala.util.{Failure, Success}

/** Manages asynchronous access to SQS queues.
  */
object SqsAsync extends LazyLogging {

  def buildClient: SqsAsyncClient = SqsAsyncClient.builder
    .region(EU_WEST_1)
    .credentialsProvider(AwsSQSSend.CredentialsProvider)
    .build()

  def send(client: SqsAsyncClient)(queueName: QueueName)(payload: Payload): Future[Unit] = {

    val futureQueueUrl =
      client
        .getQueueUrl(
          GetQueueUrlRequest.builder.queueName(queueName.value).build(),
        )
        .asScala
        .map(_.queueUrl)

    for {
      queueUrl <- futureQueueUrl
      _ <- Future.successful(logger.info(s"Sending message to SQS queue $queueUrl"))
      request = SendMessageRequest.builder.queueUrl(queueUrl).messageBody(payload.value).build()
      response = client.sendMessage(request).asScala
      _ <- response.transform {
        case Success(result) =>
          logger.info(s"Successfully sent message to $queueUrl: $result")
          Success(())
        case Failure(throwable) =>
          logger.error(s"Failed to send message to $queueUrl due to:", throwable)
          Failure(throwable)
      }
    } yield ()
  }
}
