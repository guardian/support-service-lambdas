package com.gu.holiday_stops

import java.io.Serializable

import com.gu.effects.FakeFetchString
import zio.IO

trait ConfigTest extends Configuration {
  val configuration: Configuration.Service = new Configuration.Service {
    val config: IO[Serializable, Config] =
      IO.effect(Config.fromS3(FakeFetchString.fetchString)).absolve
  }
}
