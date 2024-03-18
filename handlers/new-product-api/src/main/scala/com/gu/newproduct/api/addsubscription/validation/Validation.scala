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

  implicit class GetAndValidate[ID, DATA](result: ClientFailableOp[DATA]) {
    def andValidateWith[VALIDATED](
        validate: DATA => ValidationResult[VALIDATED],
        ifNotFoundReturn: Option[String] = None,
    ): ApiGatewayOp[VALIDATED] =
      for {
        data <- ifNotFoundReturn match {
          case Some(notFoundError) => result.toApiResponseCheckingNotFound("getting data", notFoundError)
          case None => result.toApiGatewayOp("getting data")
        }
        validatedData <- validate(data).toApiGatewayOp
      } yield validatedData
  }

  implicit class ComposeValidation[UNVALIDATED, VALIDATED](
      initialValidation: UNVALIDATED => ValidationResult[VALIDATED],
  ) {
    def thenValidate[TWICEVALIDATED](
        finalValidation: VALIDATED => ValidationResult[TWICEVALIDATED],
    ): UNVALIDATED => ValidationResult[TWICEVALIDATED] =
      (unvalidated: UNVALIDATED) =>
        for {
          validated <- initialValidation(unvalidated)
          twiceValidated <- finalValidation(validated)
        } yield twiceValidated
  }

}
