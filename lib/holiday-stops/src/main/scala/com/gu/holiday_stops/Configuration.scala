package com.gu.holiday_stops

import zio.RIO

trait Configuration {
  val configuration: Configuration.Service[Any]
}

object Configuration {
  trait Service[R] {
    val config: RIO[R, Config]
  }

  object factory extends Service[Configuration] {
    val config: RIO[Configuration, Config] = RIO.accessM(_.configuration.config)
  }
}
