package com.gu.newproduct.api.addsubscription.email

import play.api.libs.json.{Json, OWrites, Writes}

case class CContactAttributes[A](SubscriberAttributes: A)

case class CTo[A](Address: String, SubscriberKey: String, ContactAttributes: CContactAttributes[A])

case class ETPayload[A](To: CTo[A], DataExtensionName: String, SfContactId: Option[String])

object CContactAttributes {
  implicit def writes[A: Writes]: OWrites[CContactAttributes[A]] = Json.writes[CContactAttributes[A]]
}

object CTo {
  implicit def writes[A: Writes]: OWrites[CTo[A]] = Json.writes[CTo[A]]
}

object ETPayload {

  implicit def writes[A: Writes]: OWrites[ETPayload[A]] = Json.writes[ETPayload[A]]

  def apply[A](email: String, fields: A, name: DataExtensionName, sfContactId: Option[String]): ETPayload[A] =
    ETPayload(
      To = CTo(email, email, CContactAttributes(fields)),
      DataExtensionName = name.value,
      SfContactId = sfContactId,
    )
}

case class DataExtensionName(value: String)
