package com.gu.zuora.sar

import com.gu.zuora.sar.BatonModels.{
  Completed,
  Failed,
  Pending,
  PerformSarRequest,
  SarInitiateRequest,
  SarInitiateResponse,
  SarRequest,
  SarResponse,
  SarStatusRequest,
  SarStatusResponse,
}
import com.typesafe.scalalogging.LazyLogging
import java.util.UUID.randomUUID

import cats.effect.IO
import circeCodecs._
import io.circe.syntax._
import com.gu.effects.InvokeLambda

import scala.util.Try

case class ZuoraSarHandler(s3Service: S3Service, zuoraSarConfig: ZuoraSarConfig)
    extends LazyLogging
    with ZuoraHandler[SarRequest, SarResponse] {

  def initiate(initiateRequest: SarInitiateRequest): Try[SarInitiateResponse] = {

    val initiationId = randomUUID.toString

    val performSarRequest = PerformSarRequest(
      initiationId,
      initiateRequest.subjectEmail,
    )
    InvokeLambda
      .invokeLambda(zuoraSarConfig.performLambdaFunctionName, performSarRequest.asJson.toString)
      .map(_ => SarInitiateResponse(initiationId))
  }

  def status(requestIdValue: String): Try[SarStatusResponse] = {
    s3Service.checkForResults(requestIdValue, zuoraSarConfig).map {
      case S3CompletedPathFound(resultLocations) =>
        SarStatusResponse(Completed, Some(resultLocations))
      case S3FailedPathFound() => SarStatusResponse(Failed)
      case S3NoResultsFound() => SarStatusResponse(Pending)
    }
  }

  override def handle(request: SarRequest): IO[SarResponse] = IO.fromTry {
    request match {
      case r: SarInitiateRequest => initiate(r)
      case SarStatusRequest(requestIdValue) => status(requestIdValue)
    }
  }
}
