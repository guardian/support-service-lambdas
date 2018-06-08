package com.gu.util.reader

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ApiGatewayResponse.{badRequest, internalServerError}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import play.api.libs.json.{JsError, JsResult, JsSuccess}
import scalaz.{-\/, Monad, \/, \/-}

import scala.util.{Failure, Success, Try}

object Types extends Logging {

  object ApiGatewayOp {

    case class ContinueProcessing[A](a: A) extends ApiGatewayOp[A] {
      override def toDisjunction: ApiResponse \/ A = \/-(a)
    }
    case class ReturnWithResponse(resp: ApiResponse) extends ApiGatewayOp[Nothing] {
      override def toDisjunction: ApiResponse \/ Nothing = -\/(resp)
    }

  }
  sealed trait ApiGatewayOp[+A] {

    def toDisjunction: scalaz.\/[ApiResponse, A]

    def flatMap[B](f: A => ApiGatewayOp[B]): ApiGatewayOp[B] =
      toDisjunction.flatMap(f.andThen(_.toDisjunction)).toApiGatewayOp

    def map[B](f: A => B): ApiGatewayOp[B] =
      toDisjunction.map(f).toApiGatewayOp

    def mapResponse(f: ApiResponse => ApiResponse): ApiGatewayOp[A] =
      toDisjunction.leftMap(f).toApiGatewayOp

  }

  implicit val apiGatewayOpM: Monad[ApiGatewayOp] = {

    type ApiGatewayDisjunction[A] = scalaz.\/[ApiResponse, A]

    val disjunctionMonad = implicitly[Monad[ApiGatewayDisjunction]]

    new Monad[ApiGatewayOp] {

      override def bind[A, B](fa: ApiGatewayOp[A])(f: A => ApiGatewayOp[B]): ApiGatewayOp[B] = {

        val originalAsDisjunction: ApiGatewayDisjunction[A] =
          fa.toDisjunction

        val functionWithResultAsDisjunction: A => ApiGatewayDisjunction[B] =
          f.andThen(_.toDisjunction)

        val boundAsDisjunction: ApiGatewayDisjunction[B] =
          disjunctionMonad.bind(originalAsDisjunction)(functionWithResultAsDisjunction)

        boundAsDisjunction.toApiGatewayOp
      }

      override def point[A](a: => A): ApiGatewayOp[A] = ContinueProcessing(a)

    }
  }

  implicit class ApiResponseOps(apiGatewayOp: ApiGatewayOp[ApiResponse]) {

    def apiResponse: ApiResponse =
      apiGatewayOp.toDisjunction.fold(identity, identity)

  }

  import Types.ApiGatewayOp._

  // handy classes for converting things
  implicit class JsResultOps[A](jsResult: JsResult[A]) {

    def toApiGatewayOp(response: ApiResponse = badRequest): ApiGatewayOp[A] = {
      jsResult match {
        case JsSuccess(value, _) => ContinueProcessing(value)
        case JsError(error) => {
          logger.error(s"Error when deserializing JSON from API Gateway: $error")
          ReturnWithResponse(response)
        }
      }
    }

    def toApiGatewayOp(error5xx: String): ApiGatewayOp[A] = {
      jsResult match {
        case JsSuccess(apiGatewayCallout, _) => ContinueProcessing(apiGatewayCallout)
        case JsError(error) => {
          logger.error(s"Error when parsing JSON: $error")
          ReturnWithResponse(ApiGatewayResponse.internalServerError(error5xx))
        }
      }
    }

  }

  implicit class OptionOps[A](theOption: Option[A]) {

    def toApiGatewayContinueProcessing(NoneResponse: ApiResponse): ApiGatewayOp[A] =
      theOption match {
        case Some(value) => ContinueProcessing(value)
        case None => ReturnWithResponse(NoneResponse)
      }

  }

  implicit class OptionApiResponseOps(theOption: Option[ApiResponse]) {

    def toApiGatewayReturnResponse[A](NoneContinue: A = ()): ApiGatewayOp[A] =
      theOption match {
        case Some(value) => ReturnWithResponse(value)
        case None => ContinueProcessing(NoneContinue)
      }

  }

  implicit class BooleanOps[A](is: Boolean) {

    def toApiGatewayContinueProcessing(falseResponse: ApiResponse): ApiGatewayOp[Unit] =
      if (is) ContinueProcessing(())
      else ReturnWithResponse(falseResponse)

  }

  // handy classes for converting things
  implicit class TryOps[A](theTry: Try[A]) {

    def toApiGatewayOp(action: String): ApiGatewayOp[A] = {
      theTry match {
        case Success(success) => ContinueProcessing(success)
        case Failure(error) => {
          logger.error(s"Failed to $action: $error")
          ReturnWithResponse(internalServerError(s"Failed to execute lambda - unable to $action"))
        }
      }
    }

  }

  implicit class UnderlyingOps[A](theEither: scalaz.\/[ApiResponse, A]) {

    def toApiGatewayOp: ApiGatewayOp[A] =
      theEither match {
        case scalaz.\/-(success) => ContinueProcessing(success)
        case scalaz.-\/(finished) => ReturnWithResponse(finished)
      }

  }

  implicit class DisjunctionOps[L, A](theEither: scalaz.\/[L, A]) {

    def toApiGatewayOp(action: String): ApiGatewayOp[A] =
      theEither match {
        case scalaz.\/-(success) => ContinueProcessing(success)
        case scalaz.-\/(error) =>
          logger.error(s"Failed to $action: $error")
          ReturnWithResponse(internalServerError(s"Failed to execute lambda - unable to $action"))
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
