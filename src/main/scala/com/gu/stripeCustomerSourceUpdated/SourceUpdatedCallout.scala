package com.gu.stripeCustomerSourceUpdated

import play.api.libs.json.{ JsPath, Json, Reads, Writes }
import play.api.libs.functional.syntax._

case class EventData(`object`: EventDataObject)
case class EventDataObject(id: StripeSourceId, customer: StripeCustomerId, exp_month: Int, exp_year: Int, last4: String)
case class SourceUpdatedCallout(id: StripeEventId, data: EventData)

case class StripeEventId(value: String) extends AnyVal
case class StripeCustomerId(value: String) extends AnyVal
case class StripeSourceId(value: String) extends AnyVal

object SourceUpdatedCallout {

  implicit val stripeEventIdReads = Json.reads[StripeEventId]
  implicit val stripeCustomerIdReads = Json.reads[StripeCustomerId]
  implicit val stripeSourceIdReads = Json.reads[StripeSourceId]

  implicit val stripeEventIdWrites = new Writes[StripeEventId] {
    def writes(se: StripeEventId) = Json.toJson(se.value)
  }

  implicit val stripeCustomerIdWrites = new Writes[StripeCustomerId] {
    def writes(sc: StripeCustomerId) = Json.toJson(sc.value)
  }

  implicit val stripeSourceIdWrites = new Writes[StripeSourceId] {
    def writes(sc: StripeSourceId) = Json.toJson(sc.value)
  }

  implicit val eventDataObjectReads: Reads[EventDataObject] = (
    (JsPath \ "id").read[String].map(StripeSourceId.apply) and
    (JsPath \ "customer").read[String].map(StripeCustomerId.apply) and
    (JsPath \ "exp_month").read[Int] and
    (JsPath \ "exp_year").read[Int] and
    (JsPath \ "last4").read[String]
  )(EventDataObject.apply _)

  implicit val eventDataReads: Reads[EventData] = (JsPath \ "object").read[EventDataObject].map(EventData.apply _)

  implicit val jf: Reads[SourceUpdatedCallout] = (
    (JsPath \ "id").read[String].map(StripeEventId.apply) and
    (JsPath \ "data").read[EventData]
  )(SourceUpdatedCallout.apply _)

  implicit val eventDataObjectWrites: Writes[EventDataObject] = Json.writes[EventDataObject]
  implicit val eventDataWrites: Writes[EventData] = Json.writes[EventData]
  implicit val jfWrites: Writes[SourceUpdatedCallout] = Json.writes[SourceUpdatedCallout]
}
