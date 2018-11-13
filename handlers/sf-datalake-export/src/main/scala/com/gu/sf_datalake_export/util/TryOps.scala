package com.gu.sf_datalake_export.util

import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.ClientFailableOp
import scalaz.{-\/, \/, \/-}

import scala.util.{Failure, Success, Try}

object TryOps {

  implicit class ClientFailableOpsOp[SuccessType](clientFailable: ClientFailableOp[SuccessType]) {
    def toTry: Try[SuccessType] = clientFailable.toDisjunction match {
      case \/-(result) => Success(result)
      case -\/(error) => Failure(LambdaException(error.message))
    }
  }

  implicit class DisjunctionOps[SuccessType](disjunction: String \/ SuccessType) {
    def toTry: Try[SuccessType] = disjunction match {
      case \/-(result) => Success(result)
      case -\/(error) => Failure(LambdaException(error))
    }
  }

}
