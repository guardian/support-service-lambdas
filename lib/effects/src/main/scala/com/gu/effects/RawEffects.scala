package com.gu.effects

import com.gu.util.Stage
import okhttp3.{Request, Response}
import java.time.LocalDateTime

import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}

import scala.util.Try

// this is turning into a big object and is not cohesive, don't add anything else
case class RawEffects(
  response: Request => Response,
  stage: Stage,
  s3Load: Stage => Try[String]
)

object RawEffects {

  // This is the effects that actually does stuff in side effects
  //@deprecated("for testability, don't pass all the effects in in one blob, just the specific ones you actually need from below", "")
  def createDefault = {
    RawEffects(Http.response, stage, ConfigLoad.load)
  }

  val stage = Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))

  val response: Request => Response = Http.response
  def s3Load: Stage => Try[String] = ConfigLoad.load
  def s3Write: PutObjectRequest => Try[PutObjectResult] = UploadToS3.putObject
  def now = () => LocalDateTime.now

}
