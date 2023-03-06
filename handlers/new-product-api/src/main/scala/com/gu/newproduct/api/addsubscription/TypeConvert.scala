package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError, NotFound, PaymentError}

import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {

    def failureHandler(clientFailure: ClientFailure) = clientFailure match {
      case PaymentError(_) => ApiGatewayResponse.paymentRequired
      case _ => ApiGatewayResponse.internalServerError(s"unknown error: ${clientFailure.message}")
    }

    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp(failureHandler(_))
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

  implicit class EitherToApiGatewayOp[A, B](either: Either[A, B]) {
    def toApiGatewayOpOr422: ApiGatewayOp[B] = either match {
      case Right(value) => ContinueProcessing(value)
      case Left(failure) => ReturnWithResponse(ApiValidationErrorResponse(failure.toString))
    }
  }

  private def ApiValidationErrorResponse[A](message: String): ApiResponse = {
    ApiGatewayResponse.messageResponse("422", message)
  }

  implicit class ClientFailableOpToApiResponse[A](clientFailableOp: ClientFailableOp[A]) {
    def toApiResponseCheckingNotFound(action: String, ifNotFoundReturn: String): ApiGatewayOp[A] =
      clientFailableOp match {
        case NotFound(_) => ReturnWithResponse(ApiValidationErrorResponse(ifNotFoundReturn))
        case anyOtherResponse => anyOtherResponse.toDisjunction.toApiGatewayOp(action)
      }
  }

  implicit class OptionToClientFailableOp[A](option: Option[A]) {
    def toClientFailable(errorMessage: String, acceptablePaymentMethod: Boolean = true) = option match {
      case None if !acceptablePaymentMethod => PaymentError(errorMessage)
      case None => GenericError(errorMessage)
      case Some(value) => ClientSuccess(value)
    }
  }

  implicit class TryToClientFailableOp[A](tryValue: Try[A]) extends Logging {
    def toClientFailable(action: String) = tryValue match {
      case Success(response) => ClientSuccess(response)
      case Failure(exception) => GenericError(s"exception thrown while trying to $action : ${exception.toString}")

    }
  }

}
