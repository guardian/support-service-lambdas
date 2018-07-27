package com.gu.newproduct.api.addsubscription.email

import play.api.libs.json.{JsValue, Json, Writes}

trait EmailFields

//case class DirectDebitFields //these are optional but should be at the same level as the rest of the fields in the json
case class ContributionFields(
  EmailAddress: String, // why do we need the email here as well?
  created: String,
  amount: String,
  currency: String,
  edition: String,
  name: String,
  product: String
) extends EmailFields
object ContributionFields {
  implicit val writes = Json.writes[ContributionFields]
}
object EmailFields {
  implicit val writes = new Writes[EmailFields] {
    override def writes(o: EmailFields): JsValue = o match {
      case c: ContributionFields => ContributionFields.writes.writes(c)
    }
  }
}

case class CContactAttributes(SubscriberAttributes: EmailFields)

case class CTo(Address: String, SubscriberKey: String, ContactAttributes: CContactAttributes)

case class Payload(To: CTo, DataExtensionName: String)

object CContactAttributes {
  implicit val writes = Json.writes[CContactAttributes]
}

object CTo {
  implicit val writes = Json.writes[CTo]
}

object Payload {
  implicit val writes = Json.writes[Payload]
}
