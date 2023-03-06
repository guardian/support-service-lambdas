package com.gu.effects

import java.nio.charset.StandardCharsets.UTF_8

import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
  SystemPropertyCredentialsProvider,
}
import software.amazon.awssdk.core.SdkBytes
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.lambda.LambdaClient
import software.amazon.awssdk.services.lambda.model.InvocationType.EVENT
import software.amazon.awssdk.services.lambda.model.{InvokeRequest, InvokeResponse}

import scala.util.Try

object InvokeLambda extends LazyLogging {

  def invokeLambda(functionName: String, lambdaPayload: String): Try[InvokeResponse] =
    Try(
      AwsLambda.client.invoke(
        InvokeRequest.builder
          .functionName(functionName)
          .payload(SdkBytes.fromString(lambdaPayload, UTF_8))
          .invocationType(EVENT)
          .build(),
      ),
    )
}

object AwsLambda {

  val client: LambdaClient = LambdaClient.builder
    .credentialsProvider(awsCredentials.CredentialsProvider)
    .region(EU_WEST_1)
    .build()
}

object awsCredentials {
  val ProfileName = "membership"

  lazy val CredentialsProvider: AwsCredentialsProviderChain = AwsCredentialsProviderChain.builder
    .credentialsProviders(
      EnvironmentVariableCredentialsProvider.create(),
      SystemPropertyCredentialsProvider.create(),
      ProfileCredentialsProvider.create(ProfileName),
    )
    .build()
}
