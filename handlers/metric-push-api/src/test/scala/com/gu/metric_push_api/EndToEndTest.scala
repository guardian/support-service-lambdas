package com.gu.metric_push_api

import com.gu.effects.cloudwatch.AwsCloudWatchMetricPut.{MetricDimensionName, MetricDimensionValue, MetricName, MetricNamespace, MetricRequest}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ResponseModels.{ApiResponse, CacheNoCache, Headers}
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Success, Try}

class EndToEndTest extends FlatSpec with Matchers {

  it should "fail with an invalid input" in {

    val expected = ApiResponse(
      statusCode = "400",
      body =
        """{
          |  "message" : "Bad request: query parameters couldn't be parsed"
          |}""".stripMargin,
      headers = Headers()
    )

    val input = ApiGatewayRequest(Some(Map("invalidkey" -> "value")), None, None, None)

    val putEffect = EffectMock[MetricRequest, Try[Unit]](Success(()))

    val responseString = Handler.operationForEffects(Stage("DEV"), putEffect.call).map(_.steps(input)).apiResponse

    responseString.copy(body = responseString.body.map(_.replaceFirst(""": List.*"""", """""""))) should be(expected)
    putEffect.requests.toList should be(Nil)

  }

  it should "fail with an valid key but invalid metric" in {

    val expected = ApiResponse(
      statusCode = "404",
      body =
        """{
          |  "message" : "invalid metric name"
          |}""".stripMargin,
      headers = Headers()
    )

    val input = ApiGatewayRequest(Some(Map("metricName" -> "value")), None, None, None)

    val putEffect = EffectMock[MetricRequest, Try[Unit]](Success(()))

    val responseString = Handler.operationForEffects(Stage("DEV"), putEffect.call).map(_.steps(input)).apiResponse

    responseString should be(expected)
    putEffect.requests.toList should be(Nil)

  }

  it should "succeed" in {

    val expected = ApiResponse(
      statusCode = "204",
      body = None,
      headers = Headers(contentType = None, cache = CacheNoCache)
    )
    val expectedRequest = MetricRequest(
      MetricNamespace("support-service-lambdas"),
      MetricName("ClientSideRenderError"),
      Map(MetricDimensionName("Stage") -> MetricDimensionValue("DEV"))
    )

    val input = ApiGatewayRequest(Some(Map("metricName" -> "ClientSideRenderError")), None, None, None)

    val putEffect = EffectMock[MetricRequest, Try[Unit]](Success(()))

    val responseString = Handler.operationForEffects(Stage("DEV"), putEffect.call).map(_.steps(input)).apiResponse

    responseString should be(expected)
    putEffect.requests.toList should be(expectedRequest :: Nil)

  }

}

case class EffectMock[INPUT, OUTPUT](output: OUTPUT) {
  val requests = scala.collection.mutable.ArrayBuffer.empty[INPUT]
  def call: INPUT => OUTPUT = { input =>
    requests += input
    output
  }
}
