package com.gu.batchemailsender.api.batchemail

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import play.api.libs.json.{JsObject, Json}
import software.amazon.awssdk.services.sqs.SqsClient

import scala.collection.parallel.CollectionConverters.ImmutableIterableIsParallelizable
import scala.util.Try

case class SendResult(json: JsObject, failure: Option[Throwable]) {
  val isFailed = failure.isDefined
}

object SendResult {
  def from(json: JsObject, result: Try[Unit]): SendResult =
    SendResult(json, result.fold(throwable => Some(throwable), _ => None))
}

class SendEmailBatchToSqs(val queueName: QueueName, sqsClient: SqsClient) {
  def apply(messages: List[JsObject]): List[SendResult] = {
    messages.par.map { json =>
      val payload = Payload(Json.prettyPrint(json))
      val result = SqsSync.send(sqsClient)(queueName)(payload)
      SendResult.from(json, result)
    }.toList
  }
}
