package com.gu.digital_voucher_cancellation_processor

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}
import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging

import scala.io.Source
import cats.syntax.all._
import org.asynchttpclient.DefaultAsyncHttpClient

import scala.util.{Failure, Success, Try}

object Handler extends LazyLogging {
  def handle(is: InputStream, os: OutputStream): Unit = {
    logger.info(s"Received Scheduling Event: ${Source.fromInputStream(is).mkString}")
    val httpClient = new DefaultAsyncHttpClient()
    val results = Try(DigitalVoucherCancellationProcessorApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"), httpClient)
      .value
      .unsafeRunSync()
      .valueOr { error =>
        logger.error(s"Processor failed: ${error.toString}")
        throw new RuntimeException(error.toString)
      }.show) match {
      case Failure(exception) =>
        httpClient.close()
        throw exception
      case Success(rs) =>
        httpClient.close()
        rs
    }
    logger.info(s"Processor ran successfully: ${results.show}")
    os.write(s"Processor ran successfully: ${results.show}".getBytes("UTF-8"))
  }

  def main(args: Array[String]): Unit = {
    handle(new ByteArrayInputStream("".getBytes), new ByteArrayOutputStream())
  }
}
