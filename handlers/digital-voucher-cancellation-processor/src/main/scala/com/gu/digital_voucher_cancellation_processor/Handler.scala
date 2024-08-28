package com.gu.digital_voucher_cancellation_processor

import cats.effect.{ContextShift, IO}

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}
import com.gu.AppIdentity
import com.typesafe.scalalogging.LazyLogging

import scala.io.Source
import cats.syntax.all._
import com.gu.effects.aws
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import scala.concurrent.ExecutionContext

object Handler extends LazyLogging {
  def handle(is: InputStream, os: OutputStream): Unit = {
    logger.info(s"Received Scheduling Event: ${Source.fromInputStream(is).mkString}")

    implicit val contextShift: ContextShift[IO] = IO.contextShift(ExecutionContext.global)

    val results = AsyncHttpClientCatsBackend[IO]()
      .flatMap { sttpBackend =>
        DigitalVoucherCancellationProcessorApp(
          AppIdentity.whoAmI(defaultAppName = "digital-voucher-api", aws.CredentialsProvider).get,
          sttpBackend,
        ).value
      }
      .unsafeRunSync()
      .valueOr { error =>
        logger.error(s"Processor failed: ${error.toString}")
        throw new RuntimeException(error.toString)
      }
      .show
    logger.info(s"Processor ran successfully: ${results.show}")
    os.write(s"Processor ran successfully: ${results.show}".getBytes("UTF-8"))
  }

  def main(args: Array[String]): Unit = {
    handle(new ByteArrayInputStream("".getBytes), new ByteArrayOutputStream())
  }
}
