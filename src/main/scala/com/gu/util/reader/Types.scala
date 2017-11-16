package com.gu.util.reader

import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  type FailableOp[A] = ApiResponse \/ A

  // unfortunately the trait is needed for the monad transformer to provide a context for the state type I
  // since the EitherT type constructor first argument is specifically a higher kinded type with arity one but Reader has arity two
  // see pages such as https://meta.plasm.us/posts/2015/07/11/roll-your-own-scala/
  // this leaves us with a kind of curried type constructor
  trait WithDeps[I] {
    type XReader[A] = Reader[I, A] // needed becuase EitherT first type param is a single arity
    type FailableOp[A] = EitherT[XReader, ApiResponse, A]
  }

  // lets us use the Reader .local function through the EitherT
  // this is important to let us have different dependencies for different functions
  implicit class WithDepsFailableOpOps[A, F](httpFailable: WithDeps[F]#FailableOp[A]) {

    def local[I](func: I => F): WithDeps[I]#FailableOp[A] = {
      EitherT[WithDeps[I]#XReader, ApiResponse, A](httpFailable.run.local[I](func))
    }

  }

  // if we use a reader in our code, this lets us put the type massaging for the for comprehension right to the end of the line
  implicit class WithDepsReaderFailableOpOps[R, T](r: Reader[T, FailableOp[R]]) {

    def toDepsFailableOp: WithDeps[T]#FailableOp[R] =
      EitherT[WithDeps[T]#XReader, ApiResponse, R](r)

  }

  // if we have a failable op in a for comprehension, this call sits at the end of the line to massage the type
  implicit class FailableOpOps[A](failableOp: FailableOp[A]) {

    def toReader[T]: WithDeps[T]#FailableOp[A] =
      EitherT[WithDeps[T]#XReader, ApiResponse, A](Reader[T, FailableOp[A]]((_: T) => failableOp))

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

}
