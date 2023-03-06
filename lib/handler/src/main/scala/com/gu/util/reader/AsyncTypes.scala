package com.gu.util.reader

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types.ApiGatewayOp
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

object AsyncTypes extends Logging {

  case class AsyncApiGatewayOp[A](underlying: Future[ApiGatewayOp[A]]) {

    def map[B](f: A => B): AsyncApiGatewayOp[B] = AsyncApiGatewayOp {
      underlying.map(apigatewayOp => apigatewayOp.map(f))
    }

    def flatMap[B](f: A => AsyncApiGatewayOp[B]): AsyncApiGatewayOp[B] = AsyncApiGatewayOp {
      underlying.flatMap {
        case ContinueProcessing(a) => f(a).underlying
        case returnWithResponse: ReturnWithResponse => Future.successful(returnWithResponse)
      }
    }

    def replace(replacement: ApiGatewayOp[A]): AsyncApiGatewayOp[A] = AsyncApiGatewayOp(
      underlying.map(_ => replacement),
    )
  }

  implicit class UnitAsyncApiGatewayOps(asyncApiGatewayOp: AsyncApiGatewayOp[Unit]) extends Logging {
    def recoverAndLog(action: String): AsyncApiGatewayOp[Unit] = AsyncApiGatewayOp(
      asyncApiGatewayOp.underlying.map {
        case ReturnWithResponse(response) =>
          logger.warn(s"ignoring error while $action, original response was :$response")
          ContinueProcessing(())
        case continue => continue
      },
    )
  }
  implicit class AsyncApiResponseOps(apiGatewayOp: AsyncApiGatewayOp[ApiResponse]) {
    def apiResponse: Future[ApiResponse] = apiGatewayOp.underlying.map(x => x.apiResponse)
  }

  object AsyncApiGatewayOp {
    def apply[A](possiblyFailedFuture: Future[ApiGatewayOp[A]]): AsyncApiGatewayOp[A] = {
      val successfulFuture = possiblyFailedFuture recover { case err =>
        logger.error(s"future failed in AsyncApiGatewayOp: ${err.getMessage}", err)
        ReturnWithResponse(ApiGatewayResponse.internalServerError(err.getMessage))
      }
      new AsyncApiGatewayOp(successfulFuture)
    }

  }

  implicit class FutureToAsyncOp[A](future: Future[A]) {
    // todo remove the action param since it's not used for anything anymore
    def toAsyncApiGatewayOp(action: String): AsyncApiGatewayOp[A] = {
      val apiGatewayOp = future.map(ContinueProcessing(_))
      AsyncApiGatewayOp(apiGatewayOp)
    }
  }

  implicit class SyncToAsync[A](apiGatewayOp: ApiGatewayOp[A]) {
    def toAsync: AsyncApiGatewayOp[A] = AsyncApiGatewayOp(Future.successful(apiGatewayOp))
  }

  implicit class FunctionReturningSyncConvert[IN, OUT](syncOut: IN => ApiGatewayOp[OUT]) {
    // this used for wiring when a function only returns a sync operation but we
    // want to wire it in where an async operation is needed.  It prevents us having
    // to put .toAsync all over the for comprehensions themselves.
    def andThenConvertToAsync: IN => AsyncApiGatewayOp[OUT] =
      syncOut.andThen(_.toAsync)
  }

}
