package com.gu.effects.sqs

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.sqs.AmazonSQSAsyncClientBuilder
import com.amazonaws.services.sqs.model.SendMessageRequest
import org.apache.log4j.Logger

import scala.concurrent.{ExecutionContext, Future}

object AwsSQSSend {

  val logger = Logger.getLogger(getClass.getName)

  case class QueueName(value: String) extends AnyVal

  case class Payload(value: String) extends AnyVal

  def apply(queueName: QueueName)(payload: Payload)(implicit ex: ExecutionContext): Future[Unit] = {
    val sqsClient = AmazonSQSAsyncClientBuilder
      .standard()
      .withCredentials(aws.CredentialsProvider)
      .withRegion(Regions.EU_WEST_1)
      .build()
    val queueUrl = sqsClient.getQueueUrl(queueName.value).getQueueUrl
    logger.info(s"Sending message to SQS queue $queueUrl")
    val messageResult = AwsAsync(sqsClient.sendMessageAsync, new SendMessageRequest(queueUrl, payload.value))
    messageResult.recover {
      case throwable =>
        logger.error("Failed to send message due to $queueUrl due to:", throwable)
        throw throwable
    }.map { result =>
      logger.info(s"Successfully sent message to $queueUrl: $result")
      result
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
