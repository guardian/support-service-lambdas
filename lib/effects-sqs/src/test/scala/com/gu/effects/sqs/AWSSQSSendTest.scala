package com.gu.effects.sqs

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.test.EffectsTest
import com.typesafe.scalalogging.LazyLogging
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, ReceiveMessageRequest}

import scala.concurrent.duration.DurationInt
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.jdk.FutureConverters._
import scala.util.Random

class AWSSQSSendTest extends AsyncFlatSpec with Matchers {

  it should "be able to send a message OK" taggedAs EffectsTest in {

    val data = s"hello${Random.nextInt(10000)}"

    val testQueueName = QueueName("test-support-service-effects-tests")

    for {
      _ <- SqsAsync.send(SqsAsync.buildClient)(testQueueName)(Payload(data))
    } yield {
      val allMessages = SQSRead(testQueueName)
      val myMessages = allMessages.filter(_ == data)
      myMessages should be(List(data))
    }

  }

}

object SQSRead extends LazyLogging {

  private implicit val ec: ExecutionContext = ExecutionContext.Implicits.global

  def apply(queueName: QueueName): List[String] = {

    val sqsClient = SqsAsyncClient.builder
      .region(EU_WEST_1)
      .credentialsProvider(AwsSQSSend.CredentialsProvider)
      .build()

    val futureQueueUrl = sqsClient
      .getQueueUrl(
        GetQueueUrlRequest.builder.queueName(queueName.value).build(),
      )
      .asScala
      .map(_.queueUrl)

    val futureReceived = for {
      queueUrl <- futureQueueUrl
      _ <- Future.successful(logger.info(s"reading message from SQS queue $queueUrl"))
      request = ReceiveMessageRequest.builder
        .queueUrl(queueUrl)
        .attributeNamesWithStrings("ApproximateReceiveCount")
        .maxNumberOfMessages(10)
        .waitTimeSeconds(0)
        .build()
      received <- sqsClient
        .receiveMessage(request)
        .asScala
        .map { results =>
          results.messages.asScala.toList.map(_.body)
        }
        .recover { e =>
          logger.warn("Error encountered while receiving messages from Amazon: " + e.getMessage)
          Nil
        }
    } yield received

    Await.result(futureReceived, 10.seconds)
  }
}
