package com.gu.util.reader

import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.{ Config, ETConfig }
import okhttp3.{ Request, Response }
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  // this is useful for cross cutting state that applies everywhere
  case class HttpAndConfig[C](
      response: Request => Response,
      stage: String, // would be sensible to store the stage in the config and cross check?
      config: C // generic so we don't have to pass all the config to things that don't care
  ) {
    def isProd: Boolean = stage == "PROD"
  }

  type FailableOp[A] = ApiResponse \/ A

  // TODO TODO try aliasing the whole thing, not just the ExternalEffects
  type raw = ExternalEffects[HttpAndConfig[String]]
  type all = ExternalEffects[HttpAndConfig[Config]]
  type et = ExternalEffects[HttpAndConfig[ETConfig]]

  type http = ExternalEffects[Request => Response]

  // unfortunately the trait is needed for the monad transformer to provide a context for the state type I
  // since the EitherT type constructor first argument is specifically a higher kinded type with arity one but Reader has arity two
  // see pages such as https://meta.plasm.us/posts/2015/07/11/roll-your-own-scala/
  // this leaves us with a kind of curried type constructor
  trait ExternalEffects[I] {
    type ImpureFunctionsReader[A] = Reader[I, A] // needed becuase EitherT first type param is a single arity
    type ImpureFunctionsFailableOp[A] = EitherT[ImpureFunctionsReader, ApiResponse, A]
  }
  object ImpureFunctionsFailableOp {

    def apply[R, T](r: ExternalEffects[T]#ImpureFunctionsReader[FailableOp[R]]): ExternalEffects[T]#ImpureFunctionsFailableOp[R] =
      EitherT[ExternalEffects[T]#ImpureFunctionsReader, ApiResponse, R](r)

    // lifts any plain value all the way in, usually useful in tests
    def lift[R, T](value: R): ExternalEffects[T]#ImpureFunctionsFailableOp[R] =
      ImpureFunctionsFailableOp[R, T](Reader[T, FailableOp[R]](_ => \/.right(value)))
  }

  implicit class ETConfigHttpFailableOps[A, F](httpFailable: ExternalEffects[F]#ImpureFunctionsFailableOp[A]) {

    def local[I](func: I => F): ExternalEffects[I]#ImpureFunctionsFailableOp[A] = {
      val allReader: ExternalEffects[I]#ImpureFunctionsReader[FailableOp[A]] = httpFailable.run.local[I](func)
      EitherT[ExternalEffects[I]#ImpureFunctionsReader, ApiResponse, A](allReader)
    }

  }

  implicit class FailableOps[A](failableOp: FailableOp[A]) {

    def toConfigHttpFailableOp[T]: ExternalEffects[T]#ImpureFunctionsFailableOp[A] =
      ImpureFunctionsFailableOp[A, T](Reader[T, FailableOp[A]](_ => failableOp))

  }

  // handy classes for converting things
  implicit class JsResultOp[A](jsResult: JsResult[A]) {

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

  implicit class TryOp[A](theTry: Try[A]) {

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
