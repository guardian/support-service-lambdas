package com.gu.effects.ses

import java.util.concurrent.{Future => JFuture}

import com.amazonaws.AmazonWebServiceRequest
import com.amazonaws.handlers.AsyncHandler
import com.typesafe.scalalogging.LazyLogging

import scala.concurrent.{Future, Promise}

class AwsAsyncHandler[Request <: AmazonWebServiceRequest, Response](f: (Request, AsyncHandler[Request, Response]) => JFuture[Response], request: Request)
  extends AsyncHandler[Request, Response] with LazyLogging {

  f(request, this)

  private val promise = Promise[Response]()

  override def onError(exception: Exception): Unit = {
    logger.warn("Failure from AWSAsyncHandler", exception)
    promise.failure(exception)

  }

  override def onSuccess(request: Request, result: Response): Unit = {
    logger.debug(s"Successful result from AWS AsyncHandler $result")
    promise.success(result)
  }

  def future: Future[Response] = promise.future
}

object AwsAsync {

  def apply[Request <: AmazonWebServiceRequest, Response](
    f: (Request, AsyncHandler[Request, Response]) => JFuture[Response],
    request: Request
  ): Future[Response] = {
    val handler = new AwsAsyncHandler[Request, Response](f, request)
    handler.future
  }
}
