package com.gu.zuora.sar

import java.util.UUID.randomUUID

import cats.effect.IO
import com.amazonaws.services.lambda.runtime.Context
import com.gu.zuora.sar.BatonModels.{Completed, Failed, Pending, PerformSarRequest, SarInitiateRequest, SarInitiateResponse, SarRequest, SarResponse, SarStatusRequest, SarStatusResponse}
import com.typesafe.scalalogging.LazyLogging
import com.gu.effects.InvokeLambda
import io.circe.syntax._
import circeCodecs._

case class ZuoraSarHandler(zuoraSarConfig: ZuoraSarConfig)
  extends LazyLogging
  with ZuoraHandler[SarRequest, SarResponse] {

  def initiate(initiateRequest: SarInitiateRequest): IO[SarInitiateResponse] = {

    val initiationId = randomUUID().toString

    val performSarRequest = PerformSarRequest(
      initiationId,
      initiateRequest.subjectEmail
    )
    IO.fromTry {
      InvokeLambda.invokeLambda(zuoraSarConfig.performLambdaFunctionName, performSarRequest.asJson.toString())
        .map { invokeResult =>
          logger.info(invokeResult.toString)
          SarInitiateResponse(initiationId)
        }
    }
  }

  def status(requestIdValue: String): IO[SarStatusResponse] = {
    S3Helper.checkForResults(requestIdValue, zuoraSarConfig).map {
      case S3CompletedPathFound(resultLocations) =>
        SarStatusResponse(Completed, Some(resultLocations))
      case S3FailedPathFound() => SarStatusResponse(Failed)
      case S3NoResultsFound() => SarStatusResponse(Pending)
    }
  }

  override def handle(request: SarRequest, context: Context): IO[SarResponse] =
    request match {
      case r: SarInitiateRequest => initiate(r)
      case SarStatusRequest(requestIdValue) =>
        status(requestIdValue)
    }
}
