package com.gu.soft_opt_in_consent_setter.models

case class SoftOptInError(
    message: String,
    cause: Throwable,
    statusCode: Option[Int] = None,
    failRun: Boolean = false,
) extends Exception(message, cause)

object SoftOptInError {
  def apply(message: String) = new SoftOptInError(message, null)
}
