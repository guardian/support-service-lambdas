package com.gu.batchemailsender.api.batchemail.model
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

object EmailBatch {

  object WireModel {

    case class WireEmailBatch(batch_items: List[WireEmailBatchItem])
    case class WireEmailBatchItem(payload: WireEmailBatchItemPayload, object_name: String)
    case class WireEmailBatchItemPayload(
      record_id: String,
      to_address: String,
      subscriber_id: String,
      sf_contact_id: String,
      product: String,
      next_charge_date: String,
      last_name: String,
      identity_id: Option[String],
      first_name: String,
      email_stage: String
    )

    implicit val emailBatchItemPayloadReads = Json.reads[WireEmailBatchItemPayload]
    implicit val emailBatchItemReads = Json.reads[WireEmailBatchItem]
    implicit val emailBatch = Json.reads[WireEmailBatch]

    def fromSfDateToDisplayDate(sfDate: String): String = {
      val formattedDate: Try[String] = Try {
        val asDateTime = DateTime.parse(sfDate, DateTimeFormat.forPattern("yyyy-MM-dd"))
        asDateTime.toString(DateTimeFormat.forPattern("d MMMM yyyy"))
      }

      formattedDate match {
        case Success(date) => date
        case Failure(_) => sfDate
      }
    }

    def fromWire(wireEmailBatch: WireEmailBatch): EmailBatch = {
      val items = wireEmailBatch.batch_items.map(fromWire(_))
      EmailBatch(
        emailBatchItems = items
      )
    }

    private def fromWire(wireEmailBatchItem: WireEmailBatchItem): EmailBatchItem = {
      val emailBatchPayload = wireEmailBatchItem.payload

      EmailBatchItem(
        payload = EmailBatchItemPayload(
          EmailBatchItemId(emailBatchPayload.record_id),
          emailBatchPayload.to_address,
          SubscriberId(emailBatchPayload.subscriber_id),
          SfContactId(emailBatchPayload.sf_contact_id),
          emailBatchPayload.product,
          fromSfDateToDisplayDate(emailBatchPayload.next_charge_date),
          emailBatchPayload.last_name,
          emailBatchPayload.identity_id.map(IdentityUserId),
          emailBatchPayload.first_name,
          emailBatchPayload.email_stage
        ),
        object_name = wireEmailBatchItem.object_name
      )
    }

  }

}

case class SubscriberId(value: String) extends AnyVal
case class SfContactId(value: String) extends AnyVal
case class IdentityUserId(value: String) extends AnyVal
case class EmailBatchItemId(value: String) extends AnyVal

case class EmailBatchItemPayload(
  record_id: EmailBatchItemId,
  to_address: String,
  subscriber_id: SubscriberId,
  sf_contact_id: SfContactId,
  product: String,
  next_charge_date: String,
  last_name: String,
  identity_id: Option[IdentityUserId],
  first_name: String,
  email_stage: String
)

case class EmailBatchItem(payload: EmailBatchItemPayload, object_name: String)
case class EmailBatch(emailBatchItems: List[EmailBatchItem])

