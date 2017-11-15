package com.gu.effects

import com.gu.util.zuora.Types.ZuoraOp
import org.apache.log4j.Logger

import scalaz.{ -\/, \/- }

trait Logging {

  val logger = Logger.getLogger(getClass.getName)

  implicit class LogImplicit[A](zuoraOp: ZuoraOp[A]) {

    def withLogging(message: String): ZuoraOp[A] = {

      ZuoraOp(zuoraOp.run map {
        case \/-(success) =>
          logger.info(s"$message: Successfully with value: $success")
          \/-(success)
        case -\/(failure) =>
          logger.error(s"$message: Failed with value: $failure")
          -\/(failure) // todo some day make an error object with a backtrace...
      })

    }

  }

}
