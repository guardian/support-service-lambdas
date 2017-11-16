package com.gu.effects

import java.util.concurrent.TimeUnit

import com.gu.util.reader.Types.HttpAndConfig
import okhttp3.{ OkHttpClient, Request, Response }

object RawEffects {

  val response: Request => Response = {
    val restClient = new OkHttpClient().newBuilder()
      .readTimeout(15, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      restClient.newCall(request).execute
    }
  }
  // This is the effects that actually does stuff in side effects
  def default = {
    val stage = System.getenv("Stage")
    ConfigLoad.load(stage) map { config =>
      HttpAndConfig[String](response, stage, config)
    }
  }

}