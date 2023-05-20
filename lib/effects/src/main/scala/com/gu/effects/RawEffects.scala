package com.gu.effects

import java.io.InputStream
import java.time.LocalDateTime

import com.gu.util.config.{Stage, ZuoraEnvironment}
import okhttp3.{Request, Response}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, PutObjectRequest, PutObjectResponse}

import scala.util.Try

object RawEffects {

  val stage = Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("CODE"))
  val zuoraEnvironment = ZuoraEnvironment(Option(System.getenv("ZuoraEnvironment")).filter(_ != "").getOrElse("CODE"))

  val response: Request => Response = Http.response
  val downloadResponse: Request => Response = Http.downloadResponse
  def s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse] = UploadToS3.putObject
  def now: () => LocalDateTime = () => LocalDateTime.now
  def fetchContent(request: GetObjectRequest): Try[InputStream] = GetFromS3.fetchContent(request)

}
