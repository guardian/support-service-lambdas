package com.gu.batchemailsender.api.batchemail.model

import play.api.libs.json._
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat

import scala.util.{Failure, Success, Try}

case class SubscriberId(value: String) extends AnyVal
case class SfContactId(value: String) extends AnyVal
case class IdentityUserId(value: String) extends AnyVal
case class EmailBatchItemId(value: String) extends AnyVal

case class EmailBatch(emailBatchItems: List[EmailBatchItem])
case class EmailBatchItem(payload: EmailBatchItemPayload, object_name: String)
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

object EmailBatch {

  implicit val identityIdReader = Json.reads[IdentityUserId]
  implicit val sfContactIdReader = Json.reads[SfContactId]
  implicit val subscriptionNameReader = Json.reads[SubscriberId]

  implicit val emailBatchItemPayloadReader = new Reads[EmailBatchItemPayload] {
    override def reads(json: JsValue) = JsSuccess(EmailBatchItemPayload(
      record_id = EmailBatchItemId((json \ "record_id").as[String]),
      to_address = (json \ "to_address").as[String],
      subscriber_id = SubscriberId((json \ "subscriber_id").as[String]),
      sf_contact_id = SfContactId((json \ "sf_contact_id").as[String]),
      product = (json \ "product").as[String],
      next_charge_date = fromSfDateToDisplayDate((json \ "next_charge_date").as[String]),
      last_name = (json \ "last_name").as[String],
      identity_id = (json \ "identity_id").asOpt[String].map(IdentityUserId.apply),
      first_name = (json \ "first_name").as[String],
      email_stage = (json \ "email_stage").as[String]
    ))
  }

  implicit val emailBatchItemReader = Json.reads[EmailBatchItem]

  implicit val emailBatchReader = new Reads[EmailBatch] {
    override def reads(json: JsValue) = JsSuccess(EmailBatch(
      emailBatchItems = json.as[List[EmailBatchItem]]
    ))
  }

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

}
