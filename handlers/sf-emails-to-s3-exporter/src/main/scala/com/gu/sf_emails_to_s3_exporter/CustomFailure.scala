package com.gu.sf_emails_to_s3_exporter

case class CustomFailure(message: String)

object CustomFailure {
  def fromThrowable(throwable: Throwable): CustomFailure = {
    CustomFailure(throwable.getMessage)
  }

}
