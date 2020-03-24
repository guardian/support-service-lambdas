package com.gu.digital_voucher_cancellation_processor

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}

import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging
import scala.io.Source
import cats.implicits._

object Handler extends LazyLogging {
  def handle(is: InputStream, os: OutputStream): Unit = {
    logger.info(s"Received Scheduling Event: ${Source.fromInputStream(is).mkString}")
    val results = DigitalVoucherCancellationProcessorApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"))
      .value
      .unsafeRunSync()
      .valueOr(error => throw new RuntimeException(error.toString)).show
    logger.info(s"Processor ran successfully: ${results.show}")
    os.write(s"Processor ran successfully: ${results.show}".getBytes("UTF-8"))
  }

  def main(args: Array[String]): Unit = {
    handle(new ByteArrayInputStream("".getBytes), new ByteArrayOutputStream())
  }
}
