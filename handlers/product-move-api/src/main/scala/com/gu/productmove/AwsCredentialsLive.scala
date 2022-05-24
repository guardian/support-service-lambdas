package com.gu.productmove

import software.amazon.awssdk.auth.credentials.{AwsCredentialsProvider, AwsCredentialsProviderChain, EnvironmentVariableCredentialsProvider, ProfileCredentialsProvider}
import zio.ZIO.attemptBlocking
import zio.{IO, Layer, ZIO, ZLayer}

object AwsCredentialsLive {

  private val ProfileName = "membership"

  val layer: Layer[String, AwsCredentialsProvider] =
    ZLayer.scoped(ZIO.fromAutoCloseable(ZIO.attempt(impl))).mapError(_.toString)

  private def impl: AwsCredentialsProviderChain =
    AwsCredentialsProviderChain.builder().credentialsProviders(
      ProfileCredentialsProvider.create(ProfileName),
      EnvironmentVariableCredentialsProvider.create()
    ).build()

}
