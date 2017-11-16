package com.gu.effects

import java.util.concurrent.TimeUnit

import okhttp3.{ OkHttpClient, Request, Response }

import scala.util.Try

case class RawEffects(response: Request => Response, stage: () => String, s3Load: String => Try[String])

object RawEffects {

  // This is the effects that actually does stuff in side effects
  def default = {
    def stage() = System.getenv("Stage")
    RawEffects(Http.response, stage, ConfigLoad.load)
  }

}
