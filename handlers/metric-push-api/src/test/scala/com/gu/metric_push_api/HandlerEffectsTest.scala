package com.gu.metric_push_api

import com.gu.effects.RawEffects
import com.gu.effects.cloudwatch.AwsCloudWatchMetricPut
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ResponseModels.{ApiResponse, CacheNoCache, Headers}
import org.scalatest.{FlatSpec, Matchers}

class HandlerEffectsTest extends FlatSpec with Matchers {

  it should "not throw an error when trying to put a metric" taggedAs EffectsTest in {

    val expected = ApiResponse(
      statusCode = "204",
      body = None,
      headers = Headers(contentType = None, cache = CacheNoCache)
    )

    val input = ApiGatewayRequest(Some(Map("metricName" -> "ClientSideRenderError")), None, None, None)

    val responseString = Handler.operationForEffects(RawEffects.stage, AwsCloudWatchMetricPut.apply).map(_.steps(input)).apiResponse

    responseString should be(expected)
    println("no checking possible, but hopefully it went into cloudwatch alright")
    println("see https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#metricsV2:graph=~(metrics~(~(~'support-service-lambdas~'ClientSideRenderError~'Stage~'DEV)~(~'.~'EffectsTest~'.~'.~(visible~false)))~view~'timeSeries~stacked~false~region~'eu-west-1~start~'-PT1H~end~'P0D);query=~'*7bsupport-service-lambdas*2cStage*7d")

  }

}
