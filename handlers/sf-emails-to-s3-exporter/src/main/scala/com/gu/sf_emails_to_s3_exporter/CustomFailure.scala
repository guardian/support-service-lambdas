package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

case class CustomFailure(message: String)

object CustomFailure extends LazyLogging {

  def toMetric(eventName: String, message:String): CustomFailure = {
    logger.error(s"CustomFailure.toMetric message: $message | eventName: $eventName")
    Metrics.put(event = eventName)
    CustomFailure(message)
  }

  def fromThrowable(throwable: Throwable): CustomFailure = {
    logger.error("CustomFailure.fromThrowable throwable.getMessage:" + throwable.getMessage)
    CustomFailure(throwable.getMessage)
  }

  def fromThrowableToMetric(throwable: Throwable, eventName: String): CustomFailure = {
    logger.error(s"CustomFailure.fromThrowableToMetric throwable.getMessage: ${throwable.getMessage} | eventName: $eventName")
    Metrics.put(event = eventName)
    CustomFailure(throwable.getMessage)
  }

}
