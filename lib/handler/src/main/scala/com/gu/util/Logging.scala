package com.gu.util

import org.slf4j.LoggerFactory

trait Logging {

  val logger = LoggerFactory.getLogger(getClass)

}
