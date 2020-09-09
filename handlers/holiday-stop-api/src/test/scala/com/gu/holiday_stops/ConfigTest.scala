package com.gu.holiday_stops

import com.gu.effects.FakeFetchString
import com.gu.zuora.subscription.OverallFailure
import zio.{Task, ZIO}

trait ConfigTest extends Configuration {
  val configuration: Configuration.Service[Any] = new Configuration.Service[Any] {
    val config: Task[Config] = {
      ZIO.absolve(
        Task.effect(Config.fromS3(FakeFetchString.fetchString))
      ).mapError {
          case e: OverallFailure => new RuntimeException(e.reason)
          case t: Throwable => t
        }
    }
  }
}
