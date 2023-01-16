package com.gu.zuora.rer

import BatonModels.{Completed, Failed, Pending, PerformRerRequest, RerInitiateRequest, RerInitiateResponse, RerRequest, RerResponse, RerStatusRequest, RerStatusResponse}
import com.typesafe.scalalogging.LazyLogging

import java.util.UUID.randomUUID
import cats.effect.IO
import circeCodecs._
import io.circe.syntax._
import com.gu.effects.InvokeLambda

import scala.util.{Failure, Try}

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
      .map(_ => RerInitiateResponse(initiationId, "PerformRerLambda invoked", Pending))
  }

  def status(requestIdValue: String): Try[RerStatusResponse] = {
    s3Service.checkForResults(requestIdValue, zuoraRerConfig).map {
      case S3CompletedPathFound(resultLocations) =>
        RerStatusResponse(requestIdValue, "Success", Completed, Some(resultLocations))
      case S3FailedPathFound() => RerStatusResponse(requestIdValue, "Failed path found", Failed)
      case S3NoResultsFound() => RerStatusResponse(requestIdValue, "No results found", Pending)
    }
  }

  override def handle(request: RerRequest): IO[RerResponse] = IO.fromTry {
    request match {
      case r: RerInitiateRequest => initiate(r)
      case RerStatusRequest(requestIdValue) => status(requestIdValue)
      case _ => Failure(new RuntimeException("Unexpected request"))
    }
  }
}
