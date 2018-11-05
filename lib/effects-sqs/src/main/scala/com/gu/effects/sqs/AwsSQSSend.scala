package com.gu.effects.sqs

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.sqs.model.SendMessageRequest
import com.amazonaws.services.sqs.{AmazonSQSAsync, AmazonSQSAsyncClientBuilder}
import org.apache.log4j.Logger
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

object AwsSQSSend {

  val logger = Logger.getLogger(getClass.getName)

  case class QueueName(value: String) extends AnyVal

  case class Payload(value: String) extends AnyVal

  private def buildSqsClient(queueName: QueueName): (AmazonSQSAsync, String) = {
    val sqsClient = AmazonSQSAsyncClientBuilder
      .standard()
      .withCredentials(aws.CredentialsProvider)
      .withRegion(Regions.EU_WEST_1)
      .build()
    val queueUrl = sqsClient.getQueueUrl(queueName.value).getQueueUrl
    (sqsClient, queueUrl)
  }

  def apply(queueName: QueueName)(payload: Payload): Future[Unit] = {
    val (sqsClient: AmazonSQSAsync, queueUrl: String) = buildSqsClient(queueName)

    logger.info(s"Sending message to SQS queue $queueUrl")
    val messageResult = AwsAsync(sqsClient.sendMessageAsync, new SendMessageRequest(queueUrl, payload.value))

    messageResult.transform {
      case Success(result) =>
        logger.info(s"Successfully sent message to $queueUrl: $result")
        Success(())
      case Failure(throwable) =>
        logger.error(s"Failed to send message due to $queueUrl due to:", throwable)
        Failure(throwable)
    }
  }

  def sendSync(queueName: QueueName)(payload: Payload): Unit = {
    val (sqsClient: AmazonSQSAsync, queueUrl: String) = buildSqsClient(queueName)

    logger.info(s"Sending message to SQS queue $queueUrl")

    val messageResult = Try(sqsClient.sendMessage(new SendMessageRequest(queueUrl, payload.value)))

    messageResult.foreach { result =>
      logger.info(s"Successfully sent message to $queueUrl: $result")
    }
    messageResult.failed.foreach { throwable =>
      logger.error(s"Failed to send message due to $queueUrl due to:", throwable)
    }

  }
}

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new EnvironmentVariableCredentialsProvider,
    new SystemPropertiesCredentialsProvider,
    new ProfileCredentialsProvider(ProfileName),
    new InstanceProfileCredentialsProvider(false),
    new EC2ContainerCredentialsProviderWrapper
  )

}
