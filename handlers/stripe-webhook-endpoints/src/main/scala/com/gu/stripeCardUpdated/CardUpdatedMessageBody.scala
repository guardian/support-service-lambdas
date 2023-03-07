package com.gu.stripeCardUpdated

import play.api.libs.functional.syntax._
import play.api.libs.json._

case class EventData(`object`: EventDataObject)
case class EventDataObject(
    id: StripeCardId,
    brand: StripeBrand,
    country: StripeCountry,
    customer: StripeCustomerId,
    expiry: StripeExpiry,
    last4: StripeLast4,
)
case class CardUpdatedMessageBody(id: StripeEventId, data: EventData)

case class StripeEventId(value: String) extends AnyVal
case class StripeCustomerId(value: String) extends AnyVal
case class StripeCardId(value: String) extends AnyVal
case class StripeLast4(value: String) extends AnyVal
case class StripeExpiry(exp_month: Int, exp_year: Int)

sealed trait StripeBrand
object StripeBrand {

  case object Visa extends StripeBrand
  case object AmericanExpress extends StripeBrand
  case object MasterCard extends StripeBrand
  case object Discover extends StripeBrand
  case object JCB extends StripeBrand
  case object DinersClub extends StripeBrand
  case object Unknown extends StripeBrand

  def fromString(value: String): Option[StripeBrand] =
    Some(value).collect {
      case "Visa" => Visa
      case "American Express" => AmericanExpress
      case "MasterCard" => MasterCard
      case "Discover" => Discover
      case "JCB" => JCB
      case "Diners Club" => DinersClub
      case "Unknown" => Unknown
    }
}

case class StripeCountry(value: String) extends AnyVal

object CardUpdatedMessageBody {

  implicit val stripeEventIdReads = Json.reads[StripeEventId]
  implicit val stripeCustomerIdReads = Json.reads[StripeCustomerId]
  implicit val stripeSourceIdReads = Json.reads[StripeCardId]

  implicit val stripeEventIdWrites = new Writes[StripeEventId] {
    def writes(se: StripeEventId) = Json.toJson(se.value)
  }

  implicit val stripeCustomerIdWrites = new Writes[StripeCustomerId] {
    def writes(sc: StripeCustomerId) = Json.toJson(sc.value)
  }

  implicit val stripeSourceIdWrites = new Writes[StripeCardId] {
    def writes(sc: StripeCardId) = Json.toJson(sc.value)
  }

  implicit val stripeBrandReads: Reads[StripeBrand] = (JsPath).read[String].flatMap { brandString =>
    Reads[StripeBrand] { json =>
      StripeBrand.fromString(brandString) match {
        case None => JsError(s"invalid brand: $brandString")
        case Some(value) => JsSuccess(value)
      }
    }
  }

  implicit val eventDataObjectReads: Reads[EventDataObject] = (
    (JsPath \ "id").read[String].map(StripeCardId.apply) and
      (JsPath \ "brand").read[StripeBrand] and
      (JsPath \ "country").read[String].map(StripeCountry.apply) and
      (JsPath \ "customer").read[String].map(StripeCustomerId.apply) and
      (
        (JsPath \ "exp_month").read[Int] and
          (JsPath \ "exp_year").read[Int],
      )(StripeExpiry.apply _) and
      (JsPath \ "last4").read[String].map(StripeLast4.apply)
  )(EventDataObject.apply _)

  implicit val eventDataReads: Reads[EventData] = (JsPath \ "object").read[EventDataObject].map(EventData.apply _)

  implicit val jf: Reads[CardUpdatedMessageBody] = (
    (JsPath \ "id").read[String].map(StripeEventId.apply) and
      (JsPath \ "data").read[EventData]
  )(CardUpdatedMessageBody.apply _)

}
