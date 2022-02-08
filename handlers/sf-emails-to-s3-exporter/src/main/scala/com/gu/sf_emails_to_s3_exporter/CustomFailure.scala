package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

case class CustomFailure(message: String)

object CustomFailure extends LazyLogging {
  def fromThrowable(throwable: Throwable): CustomFailure = {
    logger.error("CustomFailure:" + throwable.getMessage)
    Metrics.put(event = "failed_s3_write_file")
    CustomFailure(throwable.getMessage)
  }

}
