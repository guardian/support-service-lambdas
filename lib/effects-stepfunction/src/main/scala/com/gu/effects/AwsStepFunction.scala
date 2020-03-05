package com.gu.effects

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.auth.{AWSCredentialsProviderChain, EC2ContainerCredentialsProviderWrapper, EnvironmentVariableCredentialsProvider, InstanceProfileCredentialsProvider, SystemPropertiesCredentialsProvider}
import com.amazonaws.regions.Regions
import com.amazonaws.services.stepfunctions.AWSStepFunctionsClient
import com.amazonaws.services.stepfunctions.model.{StartExecutionRequest, StartExecutionResult}
import com.typesafe.scalalogging.LazyLogging

import scala.util.Try

object ExecuteStepFunction extends LazyLogging {

  def executeStepFunction(stateMachineArn: String, executionRequestInput: String): Try[StartExecutionResult] = {
    val executionRequest = new StartExecutionRequest()
      .withStateMachineArn(stateMachineArn)
      .withInput(executionRequestInput)

    Try(AwsStepFunction.client.startExecution(executionRequest))
  }

}

object AwsStepFunction {

  val client = AWSStepFunctionsClient
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
