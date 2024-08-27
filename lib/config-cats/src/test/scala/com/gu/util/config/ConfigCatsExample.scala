package com.gu.util.config

import cats.effect.IO._
import cats.effect.IO
import com.gu.AppIdentity
import com.gu.effects.aws
import io.circe.generic.auto._

case class ExampleConfig(example: String, secureExample: String)

object ConfigCatsExample {
  def example(): Unit = {
    val appIdentity = AppIdentity.whoAmI(defaultAppName = "example-app", aws.CredentialsProvider).get
    for {
      exampleConfig <- ConfigLoader.loadConfig[IO, ExampleConfig](appIdentity)
      _ = println(exampleConfig)
    } yield ()
  }
}
