package com.gu.util

import com.gu.util.reader.Types.{WithDepsFailableOp, _}
import org.apache.log4j.Logger

trait Logging {

  val logger = Logger.getLogger(getClass.getName)

  protected implicit class LogImplicit[A, D](configHttpFailableOp: WithDepsFailableOp[D, A]) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): WithDepsFailableOp[D, A] = {

      (configHttpFailableOp.run map {
        _.withLogging(message)
      }).toEitherT

    }

  }

  protected implicit class LogImplicit2[A](op: A) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): A = {
      logger.info(s"$message: continued processing with value: $op")
      op
    }

  }

}
