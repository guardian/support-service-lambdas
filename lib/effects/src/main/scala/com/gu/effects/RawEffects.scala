package com.gu.effects

import okhttp3.{Request, Response}
import java.time.LocalDateTime
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Stage, ZuoraEnvironment}
import scala.util.Try
import scalaz.\/

object RawEffects {

  val stage = Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))
  val zuoraEnvironment = ZuoraEnvironment(Option(System.getenv("ZuoraEnvironment")).filter(_ != "").getOrElse("DEV"))

  val response: Request => Response = Http.response
  def s3Load: Stage => ConfigFailure \/ String = S3ConfigLoad.load
  def s3Write: PutObjectRequest => Try[PutObjectResult] = UploadToS3.putObject
  def now = () => LocalDateTime.now

}
