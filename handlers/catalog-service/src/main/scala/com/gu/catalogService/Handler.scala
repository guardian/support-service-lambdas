package com.gu.catalogService

import com.amazonaws.services.s3.model.{GetObjectRequest, PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.config.{LoadConfigModule, Stage, ZuoraEnvironment}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

import scala.util.Try

object Handler extends Logging {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.zuoraEnvironment, GetFromS3.fetchString, RawEffects.s3Write)
  }

  // this does the wiring except side effects but not any decisions, so can be used for an end to end test
  def runWithEffects(
    response: Request => Response,
    stage: Stage,
    zuoraEnvironment: ZuoraEnvironment,
    fetchString: GetObjectRequest => Try[String],
    s3Write: PutObjectRequest => Try[PutObjectResult]
  ): Unit = {
    val attempt = for {
      zuoraRestConfig <- LoadConfigModule(stage, fetchString)[ZuoraRestConfig].leftMap(_.error)
      zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      fetchCatalogAttempt <- ZuoraReadCatalog(zuoraRequests).leftMap(_.message)
      uploadCatalogAttempt <- S3UploadCatalog(stage, zuoraEnvironment, fetchCatalogAttempt, s3Write)
    } yield ()
    attempt.fold(failureReason => throw CatalogServiceException(failureReason), identity)
  }

  case class CatalogServiceException(message: String) extends Throwable(message: String)

}
