package com.gu.util.email

import com.gu.effects.sqs.AwsSQSSend.Payload
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
  billing_address1: Option[String] = None,
  billing_address2: Option[String] = None,
  billing_postcode: Option[String] = None,
  billing_city: Option[String] = None,
  billing_state: Option[String] = None,
  billing_country: Option[String] = None,
  title: Option[String] = None
)

sealed trait PrimaryKey {
  // ET will filter out multiple emails with the same payment id for PF1,2,3,4
  // ET will filter out multiple emails with the same invoice id for overdue 29
}
case class PaymentId(id: String) extends PrimaryKey
case class InvoiceId(id: String) extends PrimaryKey
case class ToDef(Address: String, SubscriberKey: String, ContactAttributes: ContactAttributesDef)

case class EmailId(id: String) extends AnyVal

object EmailId {
  def paymentFailureId(failureNumber: Int): Either[String, EmailId] = failureNumber match {
    case 1 => Right(EmailId("first-failed-payment-email"))
    case 2 => Right(EmailId("second-failed-payment-email"))
    case 3 => Right(EmailId("third-failed-payment-email"))
    case 4 => Right(EmailId("fourth-failed-payment-email"))
    case _ => Left(s"no Braze id configured for failure number: $failureNumber")
  }
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
          case PaymentId(id) => "paymentId" -> JsString(id)
          case InvoiceId(id) => "invoiceId" -> JsString(id)
        },
        "serviceStartDate" -> JsString(o.serviceStartDate),
        "serviceEndDate" -> JsString(o.serviceEndDate)
      )

      val optionalFields = Map(
        "billing_address1" -> o.billing_address1.map(JsString),
        "billing_address2" -> o.billing_address2.map(JsString),
        "billing_postcode" -> o.billing_postcode.map(JsString),
        "billing_city" -> o.billing_city.map(JsString),
        "billing_state" -> o.billing_state.map(JsString),
        "billing_country" -> o.billing_country.map(JsString),
        "title" -> o.title.map(JsString)
      ).collect { case (key, Some(value)) => key -> value }

      val allFields = fields ++ optionalFields
      JsObject(allFields)
    }
  }
  implicit val contactAttributesWrites = Json.writes[ContactAttributesDef]
  implicit val toDefWrites = Json.writes[ToDef]
  implicit val emailMessageWrites = Json.writes[EmailMessage]
}

object EmailSendSteps extends EmailSqsSerialisation with LazyLogging {
  def apply(sqsSend: Payload => Try[Unit])(emailRequest: EmailMessage): ClientFailableOp[Unit] = {
    logger.info(s"EmailSendSteps msg: $emailRequest")
    sqsSend(Payload(Json.toJson(emailRequest).toString)) match {
      case Success(_) =>
        ClientSuccess(())
      case Failure(error) =>
        logger.error(s"failed to send $emailRequest to sqs queue: ${error.getMessage}")
        GenericError(s"failure to send email payload to sqs")
    }
  }

}
