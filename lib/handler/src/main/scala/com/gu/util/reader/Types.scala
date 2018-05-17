package com.gu.util.reader

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ApiGatewayResponse.{badRequest, internalServerError}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{JsError, JsResult, JsSuccess}
import scalaz.{-\/, \/, \/-}
import scala.util.{Failure, Success, Try}

object Types extends Logging {

  type FailableOp[A] = ApiResponse \/ A

  // handy classes for converting things
  implicit class JsResultOps[A](jsResult: JsResult[A]) {

    def toFailableOp(response: ApiResponse = badRequest): FailableOp[A] = {
      jsResult match {
        case JsSuccess(value, _) => \/-(value)
        case JsError(error) => {
          logger.error(s"Error when deserializing JSON from API Gateway: $error")
          -\/(response)
        }
      }
    }

    def toFailableOp(error5xx: String): FailableOp[A] = {
      jsResult match {
        case JsSuccess(apiGatewayCallout, _) => \/-(apiGatewayCallout)
        case JsError(error) => {
          logger.error(s"Error when parsing JSON: $error")
          -\/(ApiGatewayResponse.internalServerError(error5xx))
        }
      }
    }

  }

  implicit class OptionOps[A](theOption: Option[A]) {

    def toFailableOp(NoneResponse: ApiResponse): FailableOp[A] = {
      theOption match {
        case Some(value) => \/-(value)
        case None => {
          -\/(NoneResponse)
        }
      }
    }

  }

  // handy classes for converting things
  implicit class TryOps[A](theTry: Try[A]) {

    def toFailableOp(action: String): FailableOp[A] = {
      theTry match {
        case Success(success) => \/-(success)
        case Failure(error) => {
          logger.error(s"Failed to $action: $error")
          -\/(internalServerError(s"Failed to execute lambda - unable to $action"))
        }
      }
    }

  }

  // handy class for converting things
  implicit class EitherOps[L, A](theEither: L \/ A) {

    def toFailableOp(action: String): FailableOp[A] = {
      theEither match {
        case \/-(success) => \/-(success)
        case -\/(error) => {
          logger.error(s"Failed to $action: $error")
          -\/(internalServerError(s"Failed to execute lambda - unable to $action"))
        }
      }
    }

  }

  implicit class LogImplicit[A](op: A) {

    // this is just a handy method to add logging to the end of any for comprehension
    def withLogging(message: String): A = {
      logger.info(s"$message: continued processing with value: $op")
      op
    }

  }

}
