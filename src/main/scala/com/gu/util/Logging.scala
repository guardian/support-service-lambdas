package com.gu.util

import com.gu.util.reader.Types.{ ExternalEffects, ImpureFunctionsFailableOp }
import org.apache.log4j.Logger

import scalaz.{ -\/, \/- }

trait Logging {

  val logger = Logger.getLogger(getClass.getName)

  implicit class LogImplicit[A, D](configHttpFailableOp: ExternalEffects[D]#ImpureFunctionsFailableOp[A]) {

    def withLogging(message: String): ExternalEffects[D]#ImpureFunctionsFailableOp[A] = {

      ImpureFunctionsFailableOp(configHttpFailableOp.run map {
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
