package com.gu.effects

import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  SystemPropertyCredentialsProvider,
  ProfileCredentialsProvider,
  EnvironmentVariableCredentialsProvider,
}

package object eventbridge {
  val ProfileName = "membership"

  lazy val CredentialsProvider: AwsCredentialsProviderChain = AwsCredentialsProviderChain.builder
    .credentialsProviders(
      EnvironmentVariableCredentialsProvider.create(),
      SystemPropertyCredentialsProvider.create(),
      ProfileCredentialsProvider.builder.profileName(ProfileName).build(),
    )
    .build()
}
