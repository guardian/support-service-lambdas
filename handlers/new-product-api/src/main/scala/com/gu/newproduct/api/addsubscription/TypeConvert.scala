package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, NotFound}

import scala.concurrent.Future

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp = clientOp.toDisjunction.toApiGatewayOp(_)
  }

  implicit class TypeConvertClientOpAsync[A](clientOp: ClientFailableOp[A]) {
    def toAsyncApiGatewayOp(action: String) = {
      val apiGatewayOp = Future.successful(clientOp.toApiGatewayOp(action))
      AsyncApiGatewayOp(apiGatewayOp)
    }
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

  /////

  implicit class ValidationToAsyncApiGatewayOp[A](validationResult: ValidationResult[A]) {
    def toAsyncApiGatewayOp: AsyncApiGatewayOp[A] = validationResult match {
      case Passed(value) => AsyncApiGatewayOp(ContinueProcessing(value))
      case Failed(message) => AsyncApiGatewayOp(ReturnWithResponse(ApiValidationErrorResponse(message)))
    }
  }

  implicit class ClientFailableOpToAsyncApiResponse[A](clientFailableOp: ClientFailableOp[A]) {
    def toAsyncApiResponseCheckingNotFound(action: String, ifNotFoundReturn: String): AsyncApiGatewayOp[A] = clientFailableOp match {
      case NotFound(_) => AsyncApiGatewayOp(ReturnWithResponse(ApiValidationErrorResponse(ifNotFoundReturn)))
      case anyOtherResponse => AsyncApiGatewayOp(Future.successful(anyOtherResponse.toDisjunction.toApiGatewayOp(action)))
    }
  }
  /////

}
