package com.gu.sf_emails_to_s3_exporter

import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.typesafe.scalalogging.LazyLogging

import scala.util.{Failure, Success}

object Metrics extends LazyLogging {

  private val stage = sys.env.getOrElse("Stage", "CODE")

  def put(event: String): Unit = {

    AwsCloudWatch.metricPut(
      MetricRequest(
        MetricNamespace("s3-emails-from-sf"),
        MetricName(event),
        Map(MetricDimensionName("Stage") -> MetricDimensionValue(stage)),
        1.0,
      ),
    ) match {
      case Failure(exception) => {
        logger.warn(s"Error logging Metric $event. Error:", exception)
      }
      case Success(_) => {
        logger.info(s"Metric $event logged successfully")
      }
    }
  }

}
