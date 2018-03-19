package com.gu.util.reader

import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  type FailableOp[A] = ApiResponse \/ A
  // EitherT's first type parameter is a higher kinded type with single arity
  // unfortunately we want to stack a reader into it, which takes two type parameters
  // we can get around this by using a type lambda to define a new anonymous type constructor with 1 arity (the other parameter comes from outside)
  // it looks messy, but if you squint it works
  // for more reading see https://underscore.io/blog/posts/2016/12/05/type-lambdas.html
  type WithDepsFailableOp[I, A] = EitherT[({ type XReader[AA] = Reader[I, AA] })#XReader, ApiResponse, A]

  // if we use a reader in our code, this lets us put the type massaging for the for comprehension right to the end of the line
  implicit class WithDepsReaderFailableOpOps[R, T](r: Reader[T, FailableOp[R]]) {

    def toEitherT: WithDepsFailableOp[T, R] =
      EitherT.apply[({ type XReader[AA] = Reader[T, AA] })#XReader, ApiResponse, R](r)

  }

  // handy classes for converting things
  implicit class JsResultOps[A](jsResult: JsResult[A]) {

    def toFailableOp: FailableOp[A] = {
      jsResult match {
        case JsSuccess(apiGatewayCallout, _) => \/-(apiGatewayCallout)
        case JsError(error) => {
          logger.error(s"Error when parsing JSON from API Gateway: $error")
          -\/(badRequest)
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

}
