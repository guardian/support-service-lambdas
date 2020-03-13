package com.gu.effects

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.auth.{AWSCredentialsProviderChain, EC2ContainerCredentialsProviderWrapper, EnvironmentVariableCredentialsProvider, InstanceProfileCredentialsProvider, SystemPropertiesCredentialsProvider}
import com.amazonaws.regions.Regions
import com.amazonaws.services.lambda.AWSLambdaClient
import com.amazonaws.services.lambda.model.{InvokeRequest, InvokeResult}
import com.typesafe.scalalogging.LazyLogging

import scala.util.Try

object InvokeLambda extends LazyLogging {

  def invokeLambda(functionName: String, lambdaPayload: String): Try[InvokeResult] = {
    val invokeRequest = new InvokeRequest()
      .withFunctionName(functionName)
      .withPayload(lambdaPayload)

    Try(AwsLambda.client.invoke(invokeRequest))
  }
}

object AwsLambda {

  val client = AWSLambdaClient
    .builder()
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
