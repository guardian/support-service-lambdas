package com.gu.holiday_stops

import zio.{UIO, URIO}

object Configuration {

  trait Service {
    val config: UIO[Config]
  }

  val config: URIO[Configuration, Config] = URIO.accessM(_.get.config)
}
