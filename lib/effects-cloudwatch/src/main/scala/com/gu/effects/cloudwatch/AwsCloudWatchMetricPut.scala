package com.gu.effects.cloudwatch

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.cloudwatch.model.{Dimension, MetricDatum, PutMetricDataRequest, StandardUnit}
import com.amazonaws.services.cloudwatch.{AmazonCloudWatchAsync, AmazonCloudWatchAsyncClientBuilder}
import org.apache.log4j.Logger

import scala.util.{Failure, Success, Try}

object AwsCloudWatchMetricPut {

  val logger = Logger.getLogger(getClass.getName)

  case class MetricNamespace(value: String) extends AnyVal
  case class MetricName(value: String) extends AnyVal
  case class MetricDimensionName(value: String) extends AnyVal
  case class MetricDimensionValue(value: String) extends AnyVal

  case class MetricRequest(
    namespace: MetricNamespace,
    name: MetricName,
    dimensions: Map[MetricDimensionName, MetricDimensionValue]
  )

  def apply(request: MetricRequest): Try[Unit] = {

    logger.info(s"Sending metric to cloudwatch $request")

    val putMetricDataRequest: PutMetricDataRequest = scalaToJavaRequest(request)
    Try(client.client.putMetricData(putMetricDataRequest)) match {
      case Success(result) =>
        logger.info(s"Successfully sent metric to cloudwatch $request: $result")
        Success(())
      case Failure(throwable) =>
        logger.error(s"Failed to send metric to cloudwatch $request due to:", throwable)
        Failure(throwable)
    }

  }

  private def scalaToJavaRequest(request: MetricRequest): PutMetricDataRequest = {
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
    metricDatum1.setValue(1.00)
    metricDatum1.setUnit(StandardUnit.Count)
    putMetricDataRequest.getMetricData.add(metricDatum1)
    putMetricDataRequest
  }

}

object client {

  lazy val client: AmazonCloudWatchAsync =
    AmazonCloudWatchAsyncClientBuilder
      .standard()
      .withCredentials(aws.CredentialsProvider)
      .withRegion(Regions.EU_WEST_1)
      .build()

}

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new EnvironmentVariableCredentialsProvider,
    new SystemPropertiesCredentialsProvider,
    new ProfileCredentialsProvider(ProfileName),
    new InstanceProfileCredentialsProvider(false),
    new EC2ContainerCredentialsProviderWrapper
  )

}
