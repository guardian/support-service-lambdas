package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProvider,
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
}

import scala.util.{Failure, Success, Try}

object AwsCredentialsBuilder extends LazyLogging {
  private val ProfileName = "membership"

  def buildCredentials: Either[SoftOptInError, AwsCredentialsProvider] = {
    Try(
      AwsCredentialsProviderChain
        .builder()
        .credentialsProviders(
          ProfileCredentialsProvider.create(ProfileName),
          EnvironmentVariableCredentialsProvider.create(),
        )
        .build(),
    ) match {
      case Success(credentialsProvider) => Right(credentialsProvider)
      case Failure(e) =>
        logger.error("Failed to build AWS credentials", e)
        Left(SoftOptInError("Failed to build AWS credentials"))
    }
  }
}
