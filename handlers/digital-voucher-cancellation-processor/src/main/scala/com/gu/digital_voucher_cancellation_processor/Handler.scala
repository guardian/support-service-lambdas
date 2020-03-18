package com.gu.digital_voucher_cancellation_processor

import java.io.{ByteArrayOutputStream, InputStream, OutputStream}

import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging
import cats.implicits._
import com.amazonaws.util.StringInputStream

import scala.io.Source

object Handler extends LazyLogging {
  def handle(is: InputStream, os: OutputStream): Unit = {
    logger.info(s"Received Scheduling Event: ${Source.fromInputStream(is).mkString}")
    DigitalVoucherCancellationProcessorApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"))
      .value
      .unsafeRunSync()
      .valueOr(error => throw new RuntimeException(error.toString))
    logger.info(s"Processor ran successfully")
  }

  def main(args: Array[String]): Unit = {
    handle(new StringInputStream(""), new ByteArrayOutputStream())
  }
}
