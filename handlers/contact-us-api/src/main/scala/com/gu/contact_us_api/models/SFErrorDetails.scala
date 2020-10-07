package com.gu.contact_us_api.models

case class SFErrorDetails(errorCode: String, message: String) {
  val asString = s"$errorCode - $message"
}
