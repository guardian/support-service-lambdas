package com.gu.util.zuora

import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import okhttp3.{ Request, Response }
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.Scalaz._
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  // this is useful for cross cutting state that applies everywhere
  case class StateHttp(
      response: Request => Response,
      stage: String,
      config: Config
  ) {
    def isProd: Boolean = stage == "PROD" // should come from the config
  }

  type FailableOp[A] = ApiResponse \/ A
  type ZuoraReader[A] = Reader[StateHttp, A] // needed becuase EitherT first type param is a single arity
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

}
