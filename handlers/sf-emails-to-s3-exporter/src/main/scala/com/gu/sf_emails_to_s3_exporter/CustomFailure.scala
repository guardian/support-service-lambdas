package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

case class CustomFailure(message: String)

object CustomFailure extends LazyLogging {

  def toMetric(eventName: String, message:String): CustomFailure = {
    logger.error("CustomFailure:" + message)
    Metrics.put(event = eventName)
    CustomFailure(message)
  }

  def fromThrowable(throwable: Throwable): CustomFailure = {
    logger.error("CustomFailure:" + throwable.getMessage)
    CustomFailure(throwable.getMessage)
  }

  def fromThrowableToMetric(throwable: Throwable, eventName: String): CustomFailure = {
    logger.error("CustomFailure:" + throwable.getMessage)
    Metrics.put(event = eventName)
    CustomFailure(throwable.getMessage)
  }

}
