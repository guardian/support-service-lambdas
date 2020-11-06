package com.gu.effects.sqs

import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.auth.credentials.{AwsCredentialsProviderChain, EnvironmentVariableCredentialsProvider, ProfileCredentialsProvider, SystemPropertyCredentialsProvider}
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, SendMessageRequest}
import software.amazon.awssdk.services.sqs.{SqsAsyncClient, SqsClient}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.jdk.FutureConverters._
import scala.util.{Failure, Success, Try}

object AwsSQSSend extends LazyLogging {

  case class QueueName(value: String) extends AnyVal

  case class Payload(value: String) extends AnyVal

  def sendAsync(queueName: QueueName)(payload: Payload): Future[Unit] = {

    val sqsClient = SqsAsyncClient
      .builder
      .region(EU_WEST_1)
      .credentialsProvider(aws.CredentialsProvider)
      .build()

    val futureQueueUrl =
      sqsClient.getQueueUrl(
        GetQueueUrlRequest.builder.queueName(queueName.value).build()
      ).asScala.map(_.queueUrl)

    for {
      queueUrl <- futureQueueUrl
      _ <- Future.successful(logger.info(s"Sending message to SQS queue $queueUrl"))
      request = SendMessageRequest.builder.queueUrl(queueUrl).messageBody(payload.value).build()
      response = sqsClient.sendMessage(request).asScala
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

  def sendSync(queueName: QueueName)(payload: Payload): Try[Unit] = {

    val sqsClient = SqsClient
      .builder
      .region(EU_WEST_1)
      .credentialsProvider(aws.CredentialsProvider)
      .build()

    val queueUrl = sqsClient.getQueueUrl(
      GetQueueUrlRequest.builder.queueName(queueName.value).build()
    ).queueUrl

    logger.info(s"Sending message to SQS queue $queueUrl")

    val request = SendMessageRequest.builder.queueUrl(queueUrl).messageBody(payload.value).build()
    val response = Try(sqsClient.sendMessage(request))
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

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider: AwsCredentialsProviderChain = AwsCredentialsProviderChain
    .builder
    .credentialsProviders(
      EnvironmentVariableCredentialsProvider.create(),
      SystemPropertyCredentialsProvider.create(),
      ProfileCredentialsProvider.builder.profileName(ProfileName).build()
    )
    .build()
}
