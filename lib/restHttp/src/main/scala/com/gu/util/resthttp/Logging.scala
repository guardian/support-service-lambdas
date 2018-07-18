package com.gu.util.resthttp

import org.apache.log4j.Logger

trait Logging { // in future maybe put logging into a context so the messages stack together like a stack trace

  val logger = Logger.getLogger(getClass.getName)

}
