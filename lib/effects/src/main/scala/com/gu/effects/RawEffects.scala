package com.gu.effects

import okhttp3.{Request, Response}
import java.time.LocalDateTime
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Stage, ZuoraEnvironment}
import scala.util.Try
import scalaz.\/

// this is turning into a big object and is not cohesive, don't add anything else
case class RawEffects(
  stage: Stage,
  s3Load: Stage => ConfigFailure \/ String
)

object RawEffects {

  // This is the effects that actually does stuff in side effects
  @deprecated("for testability, don't pass all the effects in in one blob, just the specific ones you actually need from below", "")
  def createDefault = {
    RawEffects(stage, S3ConfigLoad.load)
  }

  val stage = Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))
  val zuoraEnvironment = ZuoraEnvironment(Option(System.getenv("ZuoraEnvironment")).filter(_ != "").getOrElse("DEV"))

  val response: Request => Response = Http.response
  val downloadResponse: Request => Response = Http.downloadResponse
  def s3Load: Stage => ConfigFailure \/ String = S3ConfigLoad.load
  def s3Write: PutObjectRequest => Try[PutObjectResult] = UploadToS3.putObject
  def now = () => LocalDateTime.now

}
