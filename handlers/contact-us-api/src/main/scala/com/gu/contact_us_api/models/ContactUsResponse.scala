package com.gu.contact_us_api.models

import io.circe.{Encoder, Json}
import io.circe.syntax._

sealed trait ContactUsResponse {
  val success: Boolean
}

case class ContactUsSuccessfulResponse() extends ContactUsResponse {
  override val success: Boolean = true
}

case class ContactUsFailureResponse(message: String) extends ContactUsResponse {
  override val success: Boolean = false
}

object ContactUsResponse {
  implicit val encodeContactUsResponse: Encoder[ContactUsResponse] = new Encoder[ContactUsResponse] {
    final def apply(a: ContactUsResponse): Json = {
      a match {
        case a: ContactUsSuccessfulResponse => a.asJson
        case a: ContactUsFailureResponse => a.asJson
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
