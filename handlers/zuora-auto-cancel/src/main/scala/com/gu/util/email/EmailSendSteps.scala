package com.gu.util.email

import com.gu.effects.sqs.AwsSQSSend.{EmailQueueName, Payload}
import com.gu.effects.sqs.SqsSync
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{Json, Writes, _}

import scala.util.{Failure, Success, Try}

case class ContactAttributesDef(SubscriberAttributes: SubscriberAttributesDef)

case class SubscriberAttributesDef(
    subscriber_id: String,
    product: String,
    payment_method: String,
    card_type: String,
    card_expiry_date: String,
    first_name: String,
    last_name: String,
    primaryKey: PrimaryKey,
    serviceStartDate: String,
    serviceEndDate: String,
)

sealed trait PrimaryKey {
  // ET will filter out multiple emails with the same invoice id for overdue 29
}
case class InvoiceId(id: String) extends PrimaryKey
case class ToDef(Address: String, SubscriberKey: String, ContactAttributes: ContactAttributesDef)

case class EmailId(id: String) extends AnyVal

object EmailId {
  val cancelledId = EmailId("cancelled-payment-email")
}

case class EmailMessage(To: ToDef, DataExtensionName: String, SfContactId: String)

trait EmailSqsSerialisation {
  implicit val subscriberAttributesWrites = new Writes[SubscriberAttributesDef] {
    override def writes(o: SubscriberAttributesDef): JsValue = {
      val fields = Map(
        "subscriber_id" -> JsString(o.subscriber_id),
        "product" -> JsString(o.product),
        "payment_method" -> JsString(o.payment_method),
        "card_type" -> JsString(o.card_type),
        "card_expiry_date" -> JsString(o.card_expiry_date),
        "first_name" -> JsString(o.first_name),
        "last_name" -> JsString(o.last_name),
        o.primaryKey match {
          case InvoiceId(id) => "invoiceId" -> JsString(id)
        },
        "serviceStartDate" -> JsString(o.serviceStartDate),
        "serviceEndDate" -> JsString(o.serviceEndDate),
      )

      JsObject(fields)
    }
  }
  implicit val contactAttributesWrites = Json.writes[ContactAttributesDef]
  implicit val toDefWrites = Json.writes[ToDef]
  implicit val emailMessageWrites = Json.writes[EmailMessage]
}

trait EmailSender {
  def send(message: EmailMessage): ClientFailableOp[Unit]
}

object EmailSendSteps {
  def apply(): EmailSendSteps = new EmailSendSteps(SqsSync.send(SqsSync.buildClient)(EmailQueueName))
}

class EmailSendSteps(sqsSend: Payload => Try[Unit]) extends EmailSender with EmailSqsSerialisation with LazyLogging {
  override def send(emailRequest: EmailMessage): ClientFailableOp[Unit] = {
    logger.info(s"EmailSendSteps msg: $emailRequest")
    sqsSend(Payload(Json.toJson(emailRequest).toString)) match {
      case Success(_) =>
        ClientSuccess(())
      case Failure(error) =>
        logger.error(s"failed to send $emailRequest to sqs queue: ${error.getMessage}")
        GenericError(s"failure to send email payload to sqs", error.toString)
    }
  }

}
