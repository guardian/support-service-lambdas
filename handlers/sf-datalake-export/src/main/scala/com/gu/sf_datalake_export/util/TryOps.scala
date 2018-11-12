package com.gu.sf_datalake_export.util

import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.ClientFailableOp
import scalaz.{-\/, \/, \/-}

import scala.util.{Failure, Success, Try}

object TryOps {

  implicit class ClientFailableOpsOp[Success](clientFailable: ClientFailableOp[Success]) {
    def toTry: Try[Success] = clientFailable.toDisjunction match {
      case \/-(result) => Success(result)
      case -\/(error) => Failure(LambdaException(error.message))
    }
  }

  implicit class DisjunctionOps[Success](disjunction: String \/ Success) {
    def toTry: Try[Success] = disjunction match {
      case \/-(result) => Success(result)
      case -\/(error) => Failure(LambdaException(error))
    }
  }

}
