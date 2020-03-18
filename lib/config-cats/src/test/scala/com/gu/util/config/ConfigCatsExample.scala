package com.gu.util.config

import cats.effect.IO._
import cats.effect.IO
import com.gu.AppIdentity
import io.circe.generic.auto._

case class ExampleConfig(example: String, secureExample: String)

object ConfigCatsExample {
  def example(): Unit = {
    val appIdentity = AppIdentity.whoAmI(defaultAppName = "example-app")
    for {
      exampleConfig <- ConfigLoader.loadConfig[IO, ExampleConfig](appIdentity)
      _ = println(exampleConfig)
    } yield ()
  }
}
