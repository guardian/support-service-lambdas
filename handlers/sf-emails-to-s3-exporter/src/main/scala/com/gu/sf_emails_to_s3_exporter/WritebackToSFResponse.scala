package com.gu.sf_emails_to_s3_exporter

object WritebackToSFResponse {
  case class WritebackResponse(
    id: Option[String],
    message: Option[String],
    errorCode: Option[String],
    success: Option[Boolean],
    errors: Option[Seq[Option[Errors]]]
  )

  case class Errors(
    statusCode: Option[String],
    message: Option[String],
    fields: Option[Seq[String]]
  )
}
