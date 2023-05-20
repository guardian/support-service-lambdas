package com.gu.soft_opt_in_consent_setter

import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._

import scala.util.Try

object Metrics {

  private val stage = sys.env.getOrElse("Stage", "CODE")

  def put(event: String, value: Double = 1.0): Try[Unit] = {
    AwsCloudWatch.metricPut(
      MetricRequest(
        MetricNamespace("soft-opt-in-consent-setter"),
        MetricName(event),
        Map(MetricDimensionName("Stage") -> MetricDimensionValue(stage)),
        value,
      ),
    )
  }

}
