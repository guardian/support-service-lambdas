package com.gu.effects.sqs

import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
  SystemPropertyCredentialsProvider,
}

object AwsSQSSend {

  case class QueueName(value: String) extends AnyVal

  case class Payload(value: String) extends AnyVal

  val ProfileName = "membership"
  lazy val EmailQueueName = QueueName(System.getenv("EmailQueueName"))

  lazy val CredentialsProvider: AwsCredentialsProviderChain = AwsCredentialsProviderChain.builder
    .credentialsProviders(
      EnvironmentVariableCredentialsProvider.create(),
      SystemPropertyCredentialsProvider.create(),
      ProfileCredentialsProvider.builder.profileName(ProfileName).build(),
    )
    .build()
}
