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

  implicit class ComposeValidation[IN](clientFailable: ClientFailableOp[IN]) {
    def andValidateWith[OUT](validate: IN => ValidationResult[OUT]): ApiGatewayOp[OUT] =
      for {
        data <- clientFailable.toApiGatewayOp("getting stuff!")
        response <- validate(data).toApiGatewayOp
      } yield response
  }

}

