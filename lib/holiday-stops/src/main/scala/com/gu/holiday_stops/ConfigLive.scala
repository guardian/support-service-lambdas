package com.gu.holiday_stops

import com.gu.effects.GetFromS3
import com.gu.zuora.subscription
import com.gu.zuora.subscription.OverallFailure
import zio.{Task, ZIO}

trait ConfigLive extends Configuration {
  val configuration: Configuration.Service[Any] = new Configuration.Service[Any] {
    val config: Task[Config] = {
      ZIO.absolve(
        Task.effect(Config.fromS3(GetFromS3.fetchString))
      ).mapError {
          case e: OverallFailure => new RuntimeException(e.reason)
          case t: Throwable => t
        }
    }
  }
}
