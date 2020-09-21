package com.gu.contact_us_api.models

import io.circe.{Encoder, Json}

trait ContactUsResponse {
  val success: Boolean
}

case class ContactUsSuccessfulResponse() extends ContactUsResponse {
  override val success: Boolean = true
}

case class ContactUsFailureResponse(message: String) extends ContactUsResponse {
  override val success: Boolean = false
}

// What's the relationship between this val's name and circe knowing it's the decoder?
// Why does intelliJ want to simplify this by removing the apply?
object ContactUsResponse {
  implicit val encodeContactUsResponse: Encoder[ContactUsResponse] = new Encoder[ContactUsResponse] {
    final def apply(a: ContactUsResponse): Json = {
      a match {
        case a:ContactUsSuccessfulResponse => ContactUsSuccessfulResponse.encodeContactUsSuccessfulResponse(a)
        case a:ContactUsFailureResponse => ContactUsFailureResponse.encodeContactUsFailureResponse(a)
      }
    }
  }
}

object ContactUsSuccessfulResponse {
  implicit val encodeContactUsSuccessfulResponse: Encoder[ContactUsSuccessfulResponse] = new Encoder[ContactUsSuccessfulResponse] {
    final def apply(a: ContactUsSuccessfulResponse): Json = {
      Json.obj(
        ("success", Json.fromBoolean(a.success))
      )
    }
  }
}

object ContactUsFailureResponse {
  implicit val encodeContactUsFailureResponse: Encoder[ContactUsFailureResponse] = new Encoder[ContactUsFailureResponse] {
    final def apply(a: ContactUsFailureResponse): Json = {
      Json.obj(
        ("success", Json.fromBoolean(a.success)),
        ("error", Json.fromString(a.message))
      )
    }
  }
}