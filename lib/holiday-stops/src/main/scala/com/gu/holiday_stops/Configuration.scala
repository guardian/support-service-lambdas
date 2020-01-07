package com.gu.holiday_stops

import java.io.Serializable

import zio.{IO, ZIO}

trait Configuration {
  val configuration: Configuration.Service
}

object Configuration {
  trait Service {
    val config: IO[Serializable, Config]
  }

  object factory {
    val config: ZIO[Configuration, Serializable, Config] = ZIO.accessM(_.configuration.config)
  }
}
