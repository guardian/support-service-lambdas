package com.gu.holiday_stops

import com.gu.effects.FakeFetchString
import zio.{Task, TaskLayer, UIO}

object ConfigurationTest {

  val impl: TaskLayer[Configuration] =
    Task
      .fromEither(Config.fromS3(FakeFetchString.fetchString).left.map(e => new RuntimeException(e.reason)))
      .map(cnfg =>
        new Configuration.Service {
          val config: UIO[Config] = UIO(cnfg)
        },
      )
      .toLayer
}
