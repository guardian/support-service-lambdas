package com.gu.digital_voucher_cancellation_processor

import java.io.{InputStream, OutputStream}

import com.typesafe.scalalogging.LazyLogging

import scala.io.Source

object Handler extends LazyLogging {
  def handle(is: InputStream, os: OutputStream): Unit = {
    logger.info(s"Received Request: ${Source.fromInputStream(is).mkString}")
  }
}
