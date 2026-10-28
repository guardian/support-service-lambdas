package com.gu.effects.sqs

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.sqs.SqsClient
import software.amazon.awssdk.services.sqs.model.{
  GetQueueUrlRequest,
  GetQueueUrlResponse,
  SendMessageRequest,
  SendMessageResponse,
}

import scala.collection.mutable.ListBuffer
import scala.util.{Failure, Success}

class SqsSyncTest extends AnyFlatSpec with Matchers {
  private val queueName = QueueName("test-queue")
  private val queueUrl = "https://sqs.eu-west-1.amazonaws.com/123/test-queue"
  private val payload = Payload("message")

  private class Client extends SqsClient {
    val calls = ListBuffer.empty[String]
    var lookupFailure: Option[RuntimeException] = None
    var sendFailure: Option[RuntimeException] = None

    override def serviceName(): String = "sqs"
    override def close(): Unit = ()

    override def getQueueUrl(request: GetQueueUrlRequest): GetQueueUrlResponse = {
      calls += "getQueueUrl"
      request.queueName() shouldBe queueName.value
      lookupFailure.foreach(error => throw error)
      GetQueueUrlResponse.builder.queueUrl(queueUrl).build()
    }

    override def sendMessage(request: SendMessageRequest): SendMessageResponse = {
      calls += "sendMessage"
      request.queueUrl() shouldBe queueUrl
      request.messageBody() shouldBe payload.value
      sendFailure.foreach(error => throw error)
      SendMessageResponse.builder.messageId("message-1").build()
    }
  }

  "SqsSync" should "resolve the queue and send the payload" in {
    val client = new Client

    SqsSync.send(client)(queueName)(payload) shouldBe Success(())

    client.calls.toList shouldBe List("getQueueUrl", "sendMessage")
  }

  it should "return a queue lookup exception as a failure without attempting to send" in {
    val client = new Client
    val error = new RuntimeException("Queue unavailable")
    client.lookupFailure = Some(error)

    SqsSync.send(client)(queueName)(payload) shouldBe Failure(error)

    client.calls.toList shouldBe List("getQueueUrl")
  }

  it should "return a send exception as a failure without retrying" in {
    val client = new Client
    val error = new RuntimeException("Send failed")
    client.sendFailure = Some(error)

    SqsSync.send(client)(queueName)(payload) shouldBe Failure(error)

    client.calls.toList shouldBe List("getQueueUrl", "sendMessage")
  }
}
