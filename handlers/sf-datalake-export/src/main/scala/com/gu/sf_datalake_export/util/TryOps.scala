package com.gu.sf_datalake_export.util

import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.ClientFailableOp

import scala.util.{Failure, Success, Try}

object TryOps {

  implicit class ClientFailableOpsOp[SuccessType](clientFailable: ClientFailableOp[SuccessType]) {
    def toTry: Try[SuccessType] = clientFailable.toDisjunction match {
      case Right(result) => Success(result)
      case Left(error) => Failure(LambdaException(error.message))
    }
  }

  implicit class DisjunctionOps[SuccessType](disjunction: Either[String, SuccessType]) {
    def toTry: Try[SuccessType] = disjunction match {
      case Right(result) => Success(result)
      case Left(error) => Failure(LambdaException(error))
    }
  }

  implicit class OptionOps[SuccessType](option: Option[SuccessType]) {
    def toTry(noneErrorMessage: String): Try[SuccessType] = option match {
      case Some(successValue) => Success(successValue)
      case None => Failure(LambdaException(noneErrorMessage))
    }
  }

}
