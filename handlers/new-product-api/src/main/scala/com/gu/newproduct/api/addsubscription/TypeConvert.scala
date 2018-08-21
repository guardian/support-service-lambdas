package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound}

import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

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

  implicit class OptionToClientFailableOp[A](option: Option[A]) {
    def toClientFailable(errorMessage: String) = option match {
      case None => GenericError(errorMessage)
      case Some(value) => ClientSuccess(value)
    }
  }

  implicit class TryToClientFailableOp[A](tryValue: Try[A]) extends Logging {
    def toClientFailable(action: String) = tryValue match {
      case Success(response) => ClientSuccess(response)
      case Failure(exception) => {
        val errorMessage = s"exception thrown while trying to $action : ${exception.getMessage}"
        logger.error(errorMessage, exception)
        GenericError(errorMessage)
      }
    }
  }

}
