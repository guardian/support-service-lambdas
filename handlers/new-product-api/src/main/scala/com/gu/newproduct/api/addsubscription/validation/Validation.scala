package com.gu.newproduct.api.addsubscription.validation

object Validation {

  implicit class BooleanValidation(isValid: Boolean) {
    def ifFalseReturn(errorMessage: String): ValidationResult[Unit] =
      if (isValid) Passed(()) else Failed(errorMessage)
  }

  implicit class OptionValidation[A](option: Option[A]) {
    def getOrReturn(errorMsg: String): ValidationResult[A] = option match {
      case Some(value) => Passed(value)
      case None => Failed(errorMsg)
    }
  }

}

