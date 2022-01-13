package com.gu.sf_emails_to_s3_exporter

object WritebackToSFResponse {
  case class WritebackResponse(
    id: String,
    success: Boolean,
    errors: Seq[Option[String]]
  )
}
