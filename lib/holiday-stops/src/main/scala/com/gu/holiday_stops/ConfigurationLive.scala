package com.gu.holiday_stops

import com.gu.effects.GetFromS3
import zio.{Task, TaskLayer, UIO}

object ConfigurationLive {

  val impl: TaskLayer[Configuration] =
    Task
      .effect(Config.fromS3(GetFromS3.fetchString).left.map(e => new RuntimeException(e.reason)))
      .absolve
      .map(cnfg =>
        new Configuration.Service {
          val config: UIO[Config] = UIO(cnfg)
        },
      )
      .toLayer
}
