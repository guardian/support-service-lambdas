package com.gu.util.reader

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import play.api.libs.json.{JsError, JsResult, JsSuccess}
import scala.util.{Failure, Success, Try}
import cats.Monad

object Types extends Logging {
  object ApiGatewayOp {

    case class ContinueProcessing[A](a: A) extends ApiGatewayOp[A] {
      override def toDisjunction: Either[ApiResponse, A] = Right(a)

      override def toTry[B](a: B): Try[B] = Success(a)

      override def isComplete: Boolean = false
    }
    case class ReturnWithResponse(resp: ApiResponse) extends ApiGatewayOp[Nothing] {
      override def toDisjunction: Either[ApiResponse, Nothing] = Left(resp)

      override def toTry[B](a: B): Try[B] =
        if (resp.statusCode.startsWith("2")) Success(a)
        else
          Failure(new RuntimeException(s"Processing returned non-success response: ${resp.statusCode} - ${resp.body}"))

      override def isComplete: Boolean = true
    }

  }
  sealed trait ApiGatewayOp[+A] {
    def isComplete: Boolean

    def toDisjunction: Either[ApiResponse, A]
    def toTry[B](a: B): Try[B]

    def flatMap[B](f: A => ApiGatewayOp[B]): ApiGatewayOp[B] =
      toDisjunction.flatMap(f.andThen(_.toDisjunction)).toApiGatewayOp

    def map[B](f: A => B): ApiGatewayOp[B] =
      toDisjunction.map(f).toApiGatewayOp

    def mapResponse(f: ApiResponse => ApiResponse): ApiGatewayOp[A] =
      toDisjunction.left.map(f).toApiGatewayOp

  }

  implicit val apiGatewayOpM: Monad[ApiGatewayOp] = {

    type ApiGatewayDisjunction[A] = Either[ApiResponse, A]

    val disjunctionMonad = implicitly[Monad[ApiGatewayDisjunction]]

    new Monad[ApiGatewayOp] {

      override def flatMap[A, B](fa: ApiGatewayOp[A])(f: A => ApiGatewayOp[B]): ApiGatewayOp[B] = {

        val originalAsDisjunction: ApiGatewayDisjunction[A] =
          fa.toDisjunction

        val functionWithResultAsDisjunction: A => ApiGatewayDisjunction[B] =
          f.andThen(_.toDisjunction)

        val boundAsDisjunction: ApiGatewayDisjunction[B] =
          disjunctionMonad.flatMap(originalAsDisjunction)(functionWithResultAsDisjunction)

        boundAsDisjunction.toApiGatewayOp
      }

      override def tailRecM[A, B](a: A)(f: A => ApiGatewayOp[Either[A, B]]): ApiGatewayOp[B] = ???

      override def pure[A](a: A): ApiGatewayOp[A] = ContinueProcessing(a)

    }
  }

  implicit class ApiResponseOps(apiGatewayOp: ApiGatewayOp[ApiResponse]) {

    def apiResponse: ApiResponse =
      apiGatewayOp.toDisjunction.fold(identity, identity)

  }

  import Types.ApiGatewayOp._

  // handy classes for converting things
  implicit class JsResultOps[A](jsResult: JsResult[A]) {

    def toApiGatewayOp(): ApiGatewayOp[A] = {
      jsResult match {
        case JsSuccess(value, _) => ContinueProcessing(value)
        case JsError(error) => {
          logger.error(s"Error when deserializing JSON from API Gateway: $error")
          ReturnWithResponse(ApiGatewayResponse.internalServerError("Error when deserializing JSON from API Gateway"))
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

    def toApiGatewayOp(error5xx: String): ApiGatewayOp[A] = {
      theOption match {
        case Some(value) => ContinueProcessing(value)
        case None => {
          logger.error(s"None for $error5xx")
          ReturnWithResponse(ApiGatewayResponse.internalServerError(error5xx))
        }
      }
    }

    def toApiGatewayContinueProcessing(NoneResponse: => ApiResponse): ApiGatewayOp[A] =
      theOption match {
        case Some(value) => ContinueProcessing(value)
        case None => ReturnWithResponse(NoneResponse)
      }

    def toApiGatewayReturnResponse(toApiResponse: A => ApiResponse): ApiGatewayOp[Unit] =
      theOption match {
        case Some(value) => ReturnWithResponse(toApiResponse(value))
        case None => ContinueProcessing(())
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

  implicit class UnderlyingOps[A](theEither: Either[ApiResponse, A]) {

    def toApiGatewayOp: ApiGatewayOp[A] =
      theEither match {
        case Right(success) => ContinueProcessing(success)
        case Left(finished) => ReturnWithResponse(finished)
      }

  }

  implicit class EitherOps[L, A](theEither: Either[L, A]) {

    def toApiGatewayOp(action: String): ApiGatewayOp[A] =
      theEither match {
        case Right(success) => ContinueProcessing(success)
        case Left(error) =>
          logger.error(s"Failed to $action: $error")
          ReturnWithResponse(internalServerError(s"Failed to execute lambda - unable to $action"))
      }

    def toApiGatewayOp(toApiResponse: L => ApiResponse): ApiGatewayOp[A] =
      theEither match {
        case Right(success) => ContinueProcessing(success)
        case Left(error) => ReturnWithResponse(toApiResponse(error))
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
