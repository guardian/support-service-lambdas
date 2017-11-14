package com.gu.effects

import org.apache.log4j.Logger

trait Logging {

  val logger = Logger.getLogger(getClass.getName)

}
