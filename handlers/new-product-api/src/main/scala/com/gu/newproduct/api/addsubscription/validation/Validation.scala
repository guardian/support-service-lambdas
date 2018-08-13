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

  implicit class ComposeValidation[ID, DATA](getter: ID => ClientFailableOp[DATA]) {
    def andValidateWith[VALIDATED](validate: DATA => ValidationResult[VALIDATED]): ID => ApiGatewayOp[VALIDATED] = (id: ID) =>
      for {
        data <- getter(id).toApiGatewayOp("getting data") //todo see if we need to improve logging here
        validatedData <- validate(data).toApiGatewayOp
      } yield validatedData
  }

}

