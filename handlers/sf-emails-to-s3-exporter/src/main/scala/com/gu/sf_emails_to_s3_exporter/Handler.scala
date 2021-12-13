package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging

object Handler extends LazyLogging {


  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    logger.info("It works")
  }
}
