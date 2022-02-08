package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

case class CustomFailure(message: String)

object CustomFailure extends LazyLogging {
  def fromThrowable(throwable: Throwable): CustomFailure = {
    logger.error("CustomFailure:" + throwable.getMessage)
    Metrics.put(event = "failed_writeback_to_sf")
    CustomFailure(throwable.getMessage)
  }

}
