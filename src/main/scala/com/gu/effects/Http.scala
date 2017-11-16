package com.gu.effects

import java.util.concurrent.TimeUnit

import okhttp3.{ OkHttpClient, Request, Response }

object Http {

  val response: Request => Response = {
    val restClient = new OkHttpClient().newBuilder()
      .readTimeout(15, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      restClient.newCall(request).execute
    }
  }

}
