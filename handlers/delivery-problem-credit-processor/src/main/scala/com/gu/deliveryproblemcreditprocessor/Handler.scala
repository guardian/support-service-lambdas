package com.gu.deliveryproblemcreditprocessor

import com.amazonaws.services.lambda.runtime.Context
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import org.asynchttpclient.DefaultAsyncHttpClient

import scala.util.{Failure, Success, Try}

object Handler extends Lambda[None.type, List[DeliveryCreditResult]] {

  private val runtime = zio.Runtime.default

  override protected def handle(
    unused: None.type,
    context: Context
  ): Either[Throwable, List[DeliveryCreditResult]] = {
    val httpClient = new DefaultAsyncHttpClient()
    Try(runtime.unsafeRun {
      val program = new DeliveryCreditProcessor(httpClient).processAllProducts
      program.either
    }) match {
      case Failure(exception) =>
        httpClient.close()
        throw exception
      case Success(result) =>
        httpClient.close()
        result
    }
  }
}
