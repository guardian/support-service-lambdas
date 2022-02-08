package com.gu.sf_emails_to_s3_exporter

import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._

import scala.util.Try

object Metrics {

  private val stage = sys.env.getOrElse("Stage", "DEV")

  def put(event: String, value: Double = 1.0): Try[Unit] = {
    AwsCloudWatch.metricPut(
      MetricRequest(
        MetricNamespace("s3-emails-from-sf"),
        MetricName(event),
        Map(MetricDimensionName("Stage") -> MetricDimensionValue(stage)),
        value
      )
    )
  }

}
