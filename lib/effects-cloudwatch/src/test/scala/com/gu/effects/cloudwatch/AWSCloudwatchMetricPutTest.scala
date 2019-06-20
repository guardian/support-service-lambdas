package com.gu.effects.cloudwatch

import com.gu.effects.cloudwatch.AwsCloudWatchMetricPut._
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Failure, Success}

class AWSCloudwatchMetricPutTest extends FlatSpec with Matchers {

  it should "be able to send a metric OK" taggedAs EffectsTest in {

    val metricRequest = MetricRequest(
      MetricNamespace(s"support-service-lambdas"),
      MetricName("EffectsTest"),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue("DEV")
      )
    )

    AwsCloudWatchMetricPut(metricRequest) match {
      case Success(value) =>
        println("no checking possible, but hopefully it went into cloudwatch alright")
        println("see https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#metricsV2:graph=~(view~'timeSeries~stacked~false~metrics~(~(~'support-service-lambdas~'EffectsTest~'Stage~'DEV))~region~'eu-west-1);query=~'*7bsupport-service-lambdas*2cStage*7d")
      case Failure(exception) => fail("could not send metric to cloudwatch", exception)
    }

  }

}
