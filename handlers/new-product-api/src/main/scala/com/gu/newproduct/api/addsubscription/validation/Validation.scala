package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.resthttp.Types.ClientFailableOp

object Validation {

  implicit class BooleanValidation(isValid: Boolean) {
    def orFailWith(errorMessage: String): ValidationResult[Unit] =
      if (isValid) Passed(()) else Failed(errorMessage)
  }

  implicit class OptionValidation[A](option: Option[A]) {
    def getOrFailWith(errorMsg: String): ValidationResult[A] = option match {
      case Some(value) => Passed(value)
      case None => Failed(errorMsg)
    }
  }

  implicit class GetAndValidate[ID, DATA](getter: ID => ClientFailableOp[DATA]) {
    def andValidateWith[VALIDATED](validate: DATA => ValidationResult[VALIDATED], ifNotFoundReturn: Option[String] = None): ID => ApiGatewayOp[VALIDATED] =
      (id: ID) =>
        for {
          data <- ifNotFoundReturn match {
            case Some(notFoundError) => getter(id).toApiResponseCheckingNotFound("getting data", notFoundError)
            case None => getter(id).toApiGatewayOp("getting data")
          }
          validatedData <- validate(data).toApiGatewayOp
        } yield validatedData
  }

  implicit class ComposeValidation[UNVALIDATED, VALIDATED](validate: UNVALIDATED => ValidationResult[VALIDATED]) {
    def thenValidate[TWICEVALIDATED](validateAgain: VALIDATED => ValidationResult[TWICEVALIDATED]): UNVALIDATED => ValidationResult[TWICEVALIDATED] =
      (unvalidated: UNVALIDATED) =>
        for {
          validated <- validate(unvalidated)
          twiceValidated <- validateAgain(validated)
        } yield twiceValidated
  }

}

