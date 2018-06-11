package com.gu.util.zuora.internal

import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import org.apache.log4j.Logger
import scalaz.{-\/, \/-}

trait Logging { // in future maybe put logging into a context so the messages stack together like a stack trace

  val logger = Logger.getLogger(getClass.getName)

  protected implicit class LogImplicit2[A](apiGatewayOp: ClientFailableOp[A]) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): ClientFailableOp[A] = {

      apiGatewayOp match {
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
