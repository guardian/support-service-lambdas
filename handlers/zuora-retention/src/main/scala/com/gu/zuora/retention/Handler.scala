package com.gu.zuora.retention

import com.gu.util.Logging

object Handler extends Logging {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(): Unit = {
    logger.info(s"nothing here yet!")
  }

}
