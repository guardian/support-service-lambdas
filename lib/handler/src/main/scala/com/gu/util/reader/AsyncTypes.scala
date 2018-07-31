package com.gu.util.reader

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types.{ApiGatewayOp, logger}
import scala.concurrent.ExecutionContext.Implicits.global

import scala.concurrent.Future

object AsyncTypes extends Logging {

  case class AsyncApiGatewayOp[+A](underlying: Future[ApiGatewayOp[A]]) {

    def asFuture: Future[ApiGatewayOp[A]] = underlying recover {
      case err =>
        logger.error(s"future failed executing AsyncApiGatewayOp.asFuture: ${err.getMessage}", err)
        ReturnWithResponse(ApiGatewayResponse.internalServerError(err.getMessage))
    }

    def map[B](f: A => B): AsyncApiGatewayOp[B] = AsyncApiGatewayOp {
      asFuture.map {
        case ContinueProcessing(a) => ContinueProcessing(f(a))
        case returnWithResponse: ReturnWithResponse => returnWithResponse
      }
    }

    def flatMap[B](f: A => AsyncApiGatewayOp[B]): AsyncApiGatewayOp[B] = AsyncApiGatewayOp {
      asFuture.flatMap {
        case ContinueProcessing(a) => f(a).asFuture
        case returnWithResponse: ReturnWithResponse => Future.successful(returnWithResponse)
      }
    }

  }

  implicit class AsyncApiResponseOps(apiGatewayOp: AsyncApiGatewayOp[ApiResponse]) {
    def apiResponse: Future[ApiResponse] = apiGatewayOp.asFuture.map(x => x.apiResponse)
  }

  object AsyncApiGatewayOp {
    def apply[A](continue: ContinueProcessing[A]): AsyncApiGatewayOp[A] = AsyncApiGatewayOp(Future.successful(continue))
    def apply[A](response: ReturnWithResponse): AsyncApiGatewayOp[Nothing] = AsyncApiGatewayOp(Future.successful(response))

  }

  implicit class FutureToAsyncOp[A](future: Future[A]) {
    def toAsyncApiGatewayOp(action: String): AsyncApiGatewayOp[A] = {
      val apiGatewayOp = future.map(ContinueProcessing(_))
      AsyncApiGatewayOp(apiGatewayOp)
    }
  }

  implicit class SyncToAsync[A](apiGatewayOp: ApiGatewayOp[A]) {
    def toAsync: AsyncApiGatewayOp[A] = AsyncApiGatewayOp(Future.successful(apiGatewayOp))
  }
}
