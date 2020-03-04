package com.gu.sf.move.subscriptions.api

import com.gu.util.Logging

object Handler extends Logging {

  def apply(): Unit = {
    logger.info("Starting sf_move_subscriptions lambda")
  }

}
