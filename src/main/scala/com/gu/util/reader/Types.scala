package com.gu.util.reader

import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayResponse.{ badRequest, internalServerError, logger }
import com.gu.util.apigateway.ResponseModels.ApiResponse
import okhttp3.{ Request, Response }
import play.api.libs.json.{ JsError, JsResult, JsSuccess }

import scala.util.{ Failure, Success, Try }
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object Types {

  // this is useful for cross cutting state that applies everywhere - todo not everything need take the full thing though
  case class ConfigHttpGen[C](
      response: Request => Response,
      stage: String,
      config: C
  ) {
    def isProd: Boolean = stage == "PROD" // should come from the config
  }
  type ConfigHttp = ConfigHttpGen[Config]
  type RawEffects = ConfigHttpGen[String]

  type FailableOp[A] = ApiResponse \/ A
  type ConfigHttpReader[A] = Reader[ConfigHttp, A] // needed becuase EitherT first type param is a single arity
  type ConfigHttpFailableOp[A] = EitherT[ConfigHttpReader, ApiResponse, A]

  object ConfigHttpFailableOp {

    def apply[R](r: ConfigHttpReader[FailableOp[R]]): ConfigHttpFailableOp[R] =
      EitherT[ConfigHttpReader, ApiResponse, R](r)

    def lift[R](value: R): ConfigHttpFailableOp[R] =
      \/.right(value).toConfigHttpFailableOp
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

    def toConfigHttpFailableOp: ConfigHttpFailableOp[A] =
      ConfigHttpFailableOp(Reader(_ => failableOp))

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
