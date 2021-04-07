package com.gu.soft_opt_in_consent_setter.models

case class SfCompositeResponse(responses: List[SfResponse]) {
  def hasErrors: Boolean = responses.exists(!_.success)
  def errorAsString: Option[String] = if (hasErrors) Some(s"Composite Request failed with: ${responses.map(a => a.errorAsString)}") else None
}

case class SfResponse(id: Option[String], success: Boolean, errors: List[SfResponseError]) {
  def errorAsString: Option[String] = if (success) None else Some(s"RecordId: ${id.getOrElse("N/A")}; Errors: ${errors.map(a => a.errorAsString)}.")
}

case class SfResponseError(statusCode: String, message: String, fields: List[String]) {
  def errorAsString: String = s"statusCode: $statusCode; message: $message; fields: ${fields.mkString(", ")};"
}

