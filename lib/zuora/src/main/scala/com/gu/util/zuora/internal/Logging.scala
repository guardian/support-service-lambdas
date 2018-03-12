package com.gu.util.zuora.internal

import Types._

import scalaz.{ -\/, \/- }
import org.apache.log4j.Logger

trait Logging { // in future maybe put logging into a context so the messages stack together like a stack trace

  val logger = Logger.getLogger(getClass.getName)

  implicit class LogImplicit[A, D](configHttpFailableOp: WithDepsClientFailableOp[D, A]) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): WithDepsClientFailableOp[D, A] = {

      (configHttpFailableOp.run map {
        _.withLogging(message)
      }).toEitherT

    }

  }

  implicit class LogImplicit2[A](failableOp: ClientFailableOp[A]) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): ClientFailableOp[A] = {

      failableOp match {
        case \/-(continuation) =>
          logger.info(s"$message: continued processing with value: $continuation")
          \/-(continuation)
        case -\/(response) =>
          logger.error(s"$message: returned here with value: $response")
          -\/(response) // todo some day make an error object with a backtrace...
      }

    }

  }

}
