package com.gu.soft_opt_in_consent_setter.models

import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder

case class SFCompositeResponse(responses: List[SFResponse]) {
  lazy val hasErrors: Boolean = responses.exists(!_.success)
  lazy val errorsAsString: Option[String] =
    if (hasErrors) Some(s"Composite Request failed with: ${responses.map(a => a.errorAsString)}") else None
}

case class SFResponse(id: Option[String], success: Boolean, errors: List[SFResponseError]) {
  def errorAsString: Option[String] = if (success) None else Some(s"Errors: ${errors.map(a => a.errorAsString)}.")
}
object SFResponse {
  implicit val decoderSFResponseError: Decoder[SFResponseError] = deriveDecoder
  implicit val decoder: Decoder[SFResponse] = deriveDecoder
}

case class SFResponseError(statusCode: String, message: String, fields: List[String]) {
  def errorAsString: String = s"statusCode: $statusCode; message: $message; fields: ${fields.mkString(", ")};"
}
