package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

case class CustomFailure(message: String)

object CustomFailure extends LazyLogging {
  def fromThrowable(throwable: Throwable): CustomFailure = {
    logger.error("CustomFailure:" + throwable.getMessage)
    CustomFailure(throwable.getMessage)
  }

}
