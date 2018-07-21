package com.gu.newproduct.api.addsubscription.validation

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import com.gu.util.resthttp.Types.{ClientFailableOp, NotFound}

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

  implicit class ValidationToApiGatewayOp[A](validationResult: ValidationResult[A]) {
    def toApiGatewayOp: ApiGatewayOp[A] = validationResult match {
      case Passed(value) => ContinueProcessing(value)
      case Failed(message) => ReturnWithResponse(ApiValidationErrorResponse(message))
    }
  }

  def ApiValidationErrorResponse[A](message: String): ApiResponse = {
    ApiGatewayResponse.messageResponse("422", message)
  }

  implicit class ClientFailableOpToApiResponse[A](clientFailableOp: ClientFailableOp[A]) {
    def toApiResponseCheckingNotFound(action: String, ifNotFoundReturn: String): ApiGatewayOp[A] = clientFailableOp match {
      case NotFound(_) => ReturnWithResponse(ApiValidationErrorResponse(ifNotFoundReturn))
      case x => x.toDisjunction.toApiGatewayOp(action)
    }
  }

}

