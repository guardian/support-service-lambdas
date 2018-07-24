package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, NotFound}

object TypeConvert {

  implicit class TypeConvertClientOp[A](theEither: ClientFailableOp[A]) {
    def toApiGatewayOp = theEither.toDisjunction.toApiGatewayOp(_)
  }

  implicit class ValidationToApiGatewayOp[A](validationResult: ValidationResult[A]) {
    def toApiGatewayOp: ApiGatewayOp[A] = validationResult match {
      case Passed(value) => ContinueProcessing(value)
      case Failed(message) => ReturnWithResponse(ApiValidationErrorResponse(message))
    }
  }

  private def ApiValidationErrorResponse[A](message: String): ApiResponse = {
    ApiGatewayResponse.messageResponse("422", message)
  }

  implicit class ClientFailableOpToApiResponse[A](clientFailableOp: ClientFailableOp[A]) {
    def toApiResponseCheckingNotFound(action: String, ifNotFoundReturn: String): ApiGatewayOp[A] = clientFailableOp match {
      case NotFound(_) => ReturnWithResponse(ApiValidationErrorResponse(ifNotFoundReturn))
      case anyOtherResponse => anyOtherResponse.toDisjunction.toApiGatewayOp(action)
    }
  }

}
