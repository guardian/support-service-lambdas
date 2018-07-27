package com.gu.newproduct.api.addsubscription.email

import play.api.libs.json.{JsValue, Json, Writes}

trait EmailFields


case class ContributionFields(
  EmailAddress: String,
  created: String,
  amount: String,
  currency: String,
  edition: String,
  name: String,
  product: String,
  `account name`: Option[String] = None,
  `account number`: Option[String] = None,
  `sort code`: Option[String] = None,
  `Mandate ID`: Option[String] = None,
  `first payment date`: Option[String] = None, // is this going to be created + 10 days as in acquisitions from the web ?
  `payment method`: Option[String] = None
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

case class ETPayload(To: CTo, DataExtensionName: String)

object CContactAttributes {
  implicit val writes = Json.writes[CContactAttributes]
}

object CTo {
  implicit val writes = Json.writes[CTo]
}

object ETPayload {
  implicit val writes = Json.writes[ETPayload]
}
