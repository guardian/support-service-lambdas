package com.gu.holiday_stops

import java.io.Serializable

import com.gu.effects.GetFromS3
import zio.IO

trait ConfigLive extends Configuration {
  val configuration: Configuration.Service = new Configuration.Service {
    val config: IO[Serializable, Config] =
      IO.effect(Config.fromS3(GetFromS3.fetchString)).absolve
  }
}
