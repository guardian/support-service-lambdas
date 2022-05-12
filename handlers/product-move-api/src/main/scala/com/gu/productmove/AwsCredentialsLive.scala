package com.gu.productmove

import software.amazon.awssdk.auth.credentials.{AwsCredentialsProvider, EnvironmentVariableCredentialsProvider, ProfileCredentialsProvider}
import zio.ZIO.attemptBlocking
import zio.{IO, Layer, ZIO, ZLayer}

object AwsCredentialsLive {

  private val ProfileName = "membership"

  class InvalidCredentials(message: String) extends Exception

  private val membershipProfile: Layer[InvalidCredentials, ProfileCredentialsProvider] =
    ZLayer.scoped {
      ZIO.fromAutoCloseable(IO.attempt(ProfileCredentialsProvider.create(ProfileName)))
        .tap(c => attemptBlocking(c.resolveCredentials()))
        .mapError(err => InvalidCredentials(err.getMessage))
    }

  private val lambdaCreds: Layer[InvalidCredentials, EnvironmentVariableCredentialsProvider] =
    ZLayer.fromZIO {
      IO.attempt(EnvironmentVariableCredentialsProvider.create())
        .tap(c => attemptBlocking(c.resolveCredentials()))
        .mapError(err => InvalidCredentials(err.getMessage))
    }

  val layer: Layer[InvalidCredentials, AwsCredentialsProvider] = lambdaCreds <> membershipProfile

}
