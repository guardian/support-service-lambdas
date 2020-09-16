package com.gu.aws

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.auth.{AWSCredentialsProviderChain, EnvironmentVariableCredentialsProvider, InstanceProfileCredentialsProvider}
import com.amazonaws.regions.Regions
import com.amazonaws.services.cloudwatch.{AmazonCloudWatch, AmazonCloudWatchClientBuilder}
import com.amazonaws.services.cloudwatch.model.{Dimension, MetricDatum, PutMetricDataRequest, StandardUnit}
import com.gu.aws.AwsCloudWatch.MetricRequest

import scala.util.Try

object Aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new ProfileCredentialsProvider(ProfileName),
    new InstanceProfileCredentialsProvider(false),
    new EnvironmentVariableCredentialsProvider()
  )

}

object AwsCloudWatch {
  val client: AmazonCloudWatch =
    AmazonCloudWatchClientBuilder
      .standard()
      .withRegion(Regions.EU_WEST_1)
      .withCredentials(Aws.CredentialsProvider)
      .build()

  case class MetricNamespace(value: String) extends AnyVal

  case class MetricName(value: String) extends AnyVal

  case class MetricDimensionName(value: String) extends AnyVal

  case class MetricDimensionValue(value: String) extends AnyVal

  case class MetricRequest(
    namespace: MetricNamespace,
    name: MetricName,
    dimensions: Map[MetricDimensionName, MetricDimensionValue],
    value: Double = 1.0
  )

  def metricPut(request: MetricRequest): Try[Unit] = {

    val putMetricDataRequest = new PutMetricDataRequest
    putMetricDataRequest.setNamespace(request.namespace.value)

    val metricDatum1 = request.dimensions.foldLeft(
      new MetricDatum()
        .withMetricName(request.name.value)
    ) {
        case (agg, (name, value)) =>
          agg.withDimensions(
            new Dimension()
              .withName(name.value)
              .withValue(value.value)
          )
      }
    metricDatum1.setValue(request.value)
    metricDatum1.setUnit(StandardUnit.Count)
    putMetricDataRequest.getMetricData.add(metricDatum1)
    Try(client.putMetricData(putMetricDataRequest)).map(_ => ())
  }

}
