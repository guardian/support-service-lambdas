package com.gu.util.resthttp

import org.slf4j.LoggerFactory

trait Logging { // in future maybe put logging into a context so the messages stack together like a stack trace

  val logger = LoggerFactory.getLogger(getClass)

}
