package com.gu.aws

import com.gu.aws.AwsCloudWatch._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import software.amazon.awssdk.services.cloudwatch.model.StandardUnit.COUNT

class AwsCloudWatchTest extends AnyFlatSpec with Matchers {

  "buildMetricDatum" should "build correct datum" in {
    val datum = AwsCloudWatch.buildMetricDatum(
      MetricRequest(
        MetricNamespace("support-service-lambdas"),
        MetricName("cleanup-succeeded"),
        Map(
          MetricDimensionName("Stage") -> MetricDimensionValue("CODE"),
          MetricDimensionName("app") -> MetricDimensionValue("dev-env-cleaner"),
        ),
      ),
    )
    datum.metricName shouldBe "cleanup-succeeded"
    datum.dimensions.size shouldBe 2
    datum.dimensions.get(0).name shouldBe "Stage"
    datum.dimensions.get(0).value shouldBe "CODE"
    datum.dimensions.get(1).name shouldBe "app"
    datum.dimensions.get(1).value shouldBe "dev-env-cleaner"
    datum.value shouldBe 1
    datum.unit shouldBe COUNT
  }
}
