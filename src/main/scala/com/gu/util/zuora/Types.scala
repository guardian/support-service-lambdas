package com.gu.util.zuora

import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.Scalaz._
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  type FailableOp[A] = ApiResponse \/ A
  type ZuoraReader[A] = Reader[ZuoraRestRequestMaker, A] // needed becuase EitherT first type param is a single arity
  type ZuoraOp[A] = EitherT[ZuoraReader, ApiResponse, A]

  object ZuoraOp {

    def apply[R](r: ZuoraReader[FailableOp[R]]): ZuoraOp[R] =
      EitherT[ZuoraReader, ApiResponse, R](r)

    def optionLift[R](option: Option[R], defaultLeft: => ApiResponse): ZuoraOp[R] = // todo make implicit
      (option.toRightDisjunction(defaultLeft)).toZuoraOp
    def lift[R](value: R): ZuoraOp[R] = // todo make implicit
      (\/.right(value)).toZuoraOp
  }

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

  implicit class FailableOps[A](failableOp: FailableOp[A]) {

    def toZuoraOp: ZuoraOp[A] =
      ZuoraOp(Reader(_ => failableOp))

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

  implicit class LogImplicit[A](zuoraOp: ZuoraOp[A]) {

    def withLogging(message: String): ZuoraOp[A] = {

      ZuoraOp(zuoraOp.run map {
        case \/-(success) =>
          logger.info(s"$message: Successfully with value: $success")
          \/-(success)
        case -\/(failure) =>
          logger.error(s"$message: Failed with value: $failure")
          -\/(failure) // todo some day make an error object with a backtrace...
      })

    }

  }

}
