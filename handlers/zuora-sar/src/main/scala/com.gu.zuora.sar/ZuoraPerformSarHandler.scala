package com.gu.zuora.sar

import cats.effect.IO
import com.amazonaws.services.lambda.runtime.Context
import com.gu.zuora.ZuoraSarResponse
import com.gu.zuora.sar.BatonModels.{PerformSarRequest, PerformSarResponse, SarRequest, SarResponse}
import com.typesafe.scalalogging.LazyLogging

case class ZuoraPerformSarHandler(performSarLambdaConfig: PerformSarLambdaConfig)
    extends LazyLogging
    with ZuoraHandler[SarRequest, SarResponse] {

  def writeResultToS3(
      initiationReference: String,
      zuoraSarResponse: ZuoraSarResponse): IO[S3Response] = {
    ???
  }

  def initiateSar(request: PerformSarRequest,
                  context: Context): IO[PerformSarResponse] = {
      ???
  }

  override def handle(request: SarRequest,
                      context: Context): IO[SarResponse] = {
    request match {
      case r: PerformSarRequest => initiateSar(r, context)
      case _ =>
        throw new RuntimeException(
          "Unable to retrieve email and initiation reference from request.")
    }
  }
}
