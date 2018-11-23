package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.model.{EmailBatchItem, EmailBatchItemId, EmailToSend}
import com.gu.effects.sqs.AwsSQSSend.Payload
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

object SqsSendBatch {

  def sendBatchSync(sqsSend: Payload => Try[Unit])(emailBatchItems: List[EmailBatchItem]): List[EmailBatchItemId] = {
    def sqsWrapper(payload: Payload, emailBatchItemId: EmailBatchItemId): Option[EmailBatchItemId] = {
      sqsSend(payload) match {
        case Success(_) => None
        case Failure(_) => Some(emailBatchItemId)
      }
    }

    emailBatchItems flatMap { emailBatchItem: EmailBatchItem =>
      val brazeCampaignId: Option[String] = DataExtensionMap.getDataExtension(emailBatchItem.object_name) //TODO make this configurable
      val emailToSend = EmailToSend.fromEmailBatchItem(emailBatchItem, "expired-card")
      val payloadString = Json.prettyPrint(Json.toJson(emailToSend))
      sqsWrapper(Payload(payloadString), emailBatchItem.payload.record_id)
    }

  }
}
