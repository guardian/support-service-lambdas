package com.gu.effects

import okhttp3.{Request, Response}
import java.time.LocalDateTime

import com.amazonaws.services.s3.model.{GetObjectRequest, PutObjectRequest, PutObjectResult, S3ObjectInputStream}
import com.gu.util.config.{Stage, ZuoraEnvironment}

import scala.util.Try

object RawEffects {

  val stage = Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))
  val zuoraEnvironment = ZuoraEnvironment(Option(System.getenv("ZuoraEnvironment")).filter(_ != "").getOrElse("DEV"))

  val response: Request => Response = Http.response
  val downloadResponse: Request => Response = Http.downloadResponse
  def s3Write: PutObjectRequest => Try[PutObjectResult] = UploadToS3.putObject
  def now: () => LocalDateTime = () => LocalDateTime.now
  def fetchContent(request: GetObjectRequest): Try[S3ObjectInputStream] = GetFromS3.fetchContent(request)

}
