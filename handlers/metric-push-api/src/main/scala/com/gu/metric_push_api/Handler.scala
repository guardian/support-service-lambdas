package com.gu.metric_push_api

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.effects.cloudwatch.AwsCloudWatchMetricPut
import com.gu.effects.cloudwatch.AwsCloudWatchMetricPut._
import com.gu.metric_push_api.WireRequestToDomainObject.MetricPushRequest
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.{ApiResponse, CacheNoCache, Headers}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.Stage
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.util.Try

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(RawEffects.stage, AwsCloudWatchMetricPut.apply)
    }

  def domainSteps(putEffect: MetricRequest => Try[Unit], stage: Stage): MetricPushRequest => Try[Unit] = domainRequest =>
    putEffect(MetricRequest(
      MetricNamespace(s"support-service-lambdas"),
      MetricName(domainRequest.metricName.toString),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue(stage.value)
      )
    ))

  def healthcheck(putEffect: MetricRequest => Try[Unit], stage: Stage): ApiResponse = {
    val requested = putEffect(MetricRequest(
      MetricNamespace(s"support-service-lambdas"),
      MetricName("HealthCheck"),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue(stage.toString)
      )
    ))
    requested.toApiGatewayOp("put health check cloudwatch metric").map(_ => noContent()).apiResponse
  }

  def operationForEffects(stage: Stage, putEffect: MetricRequest => Try[Unit]): ApiGatewayOp[Operation] = {
    ContinueProcessing(Operation(
      WireRequestToDomainObject(domainSteps(putEffect, stage)),
      () => healthcheck(putEffect, stage)
    ))
  }

}

/*
this object handles turning api gateway stuff into more meaningful stuff for the domain
 */
object WireRequestToDomainObject {

  sealed abstract class ValidMetricName
  case object ClientSideRenderError extends ValidMetricName
  object ValidMetricName {
    def fromString(name: String): Option[ValidMetricName] =
      name match {
        case "ClientSideRenderError" => Some(ClientSideRenderError)
        case _ => None
      }
  }

  case class MetricPushRequest(metricName: ValidMetricName)

  case class WireUrlParams(metricName: String)
  implicit val wireReads = Json.reads[WireUrlParams]

  def toUrlParams(urlParamsWire: WireUrlParams): Either[String, MetricPushRequest] =
    ValidMetricName.fromString(urlParamsWire.metricName).toRight("invalid metric name").map(MetricPushRequest.apply)

  def apply(
    steps: MetricPushRequest => Try[Unit]
  ): ApiGatewayRequest => ResponseModels.ApiResponse = req =>
    (for {
      wireUrlParams <- req.queryParamsAsCaseClass[WireUrlParams]()
      metricPushRequest <- toUrlParams(wireUrlParams).toApiGatewayOp(ApiGatewayResponse.notFound _)
      stepsResult <- steps(metricPushRequest).toApiGatewayOp("failed to put cloudwatch metric")
    } yield noContent()).apiResponse

}

object noContent {
  def apply(): ResponseModels.ApiResponse =
    ApiResponse("204", None, Headers(contentType = None, cache = CacheNoCache))
}
