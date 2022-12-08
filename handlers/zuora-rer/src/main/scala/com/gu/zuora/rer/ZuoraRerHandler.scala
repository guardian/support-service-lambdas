package com.gu.zuora.rer

import BatonModels.{Completed, Failed, Pending, PerformRerRequest, RerInitiateRequest, RerInitiateResponse, RerRequest, RerResponse, RerStatusRequest, RerStatusResponse}
import com.typesafe.scalalogging.LazyLogging
import java.util.UUID.randomUUID

import cats.effect.IO
import circeCodecs._
import io.circe.syntax._
import com.gu.effects.InvokeLambda

import scala.util.Try

case class ZuoraRerHandler(s3Service: S3Service, zuoraRerConfig: ZuoraRerConfig)
  extends LazyLogging
  with ZuoraHandler[RerRequest, RerResponse] {

  def initiate(initiateRequest: RerInitiateRequest): Try[RerInitiateResponse] = {

    val initiationId = randomUUID.toString

    val performRerRequest = PerformRerRequest(
      initiationId,
      initiateRequest.subjectEmail
    )
    InvokeLambda.invokeLambda(zuoraRerConfig.performLambdaFunctionName, performRerRequest.asJson.toString)
      .map(_ => RerInitiateResponse(initiationId))
  }

  def status(requestIdValue: String): Try[RerStatusResponse] = {
    s3Service.checkForResults(requestIdValue, zuoraRerConfig).map {
      case S3CompletedPathFound(resultLocations) =>
        RerStatusResponse(Completed, Some(resultLocations))
      case S3FailedPathFound() => RerStatusResponse(Failed)
      case S3NoResultsFound() => RerStatusResponse(Pending)
    }
  }

  override def handle(request: RerRequest): IO[RerResponse] = IO.fromTry {
    request match {
      case r: RerInitiateRequest => initiate(r)
      case RerStatusRequest(requestIdValue) => status(requestIdValue)
    }
  }
}
