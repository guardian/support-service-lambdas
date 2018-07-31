package com.gu.newproduct.api.addsubscription.email

import play.api.libs.json.{Json, Writes}

case class CContactAttributes[A](SubscriberAttributes: A)

case class CTo[A](Address: String, SubscriberKey: String, ContactAttributes: CContactAttributes[A])

case class ETPayload[A](To: CTo[A], DataExtensionName: String)

object CContactAttributes {
  implicit def writes[A: Writes] = Json.writes[CContactAttributes[A]]
}

object CTo {
  implicit def writes[A: Writes] = Json.writes[CTo[A]]
}

object ETPayload {

  implicit def writes[A: Writes] = Json.writes[ETPayload[A]]

  def apply[A](email: String, fields: A): ETPayload[A] =
    ETPayload(
      To = CTo(email, email, CContactAttributes(fields)),
      DataExtensionName = "regular-contribution-thank-you"
    )
}
