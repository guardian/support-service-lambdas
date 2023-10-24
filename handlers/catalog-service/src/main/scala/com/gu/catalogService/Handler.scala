package com.gu.catalogService

import com.gu.effects.{GetFromS3, Http, RawEffects}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, ZuoraEnvironment}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.Try

object Handler extends Logging {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(): Unit = {
    runWithEffects(
      Http.responseWithTimeout(120),
      RawEffects.stage,
      RawEffects.zuoraEnvironment,
      GetFromS3.fetchString,
      RawEffects.s3Write,
    )
  }

  // this does the wiring except side effects but not any decisions, so can be used for an end to end test
  def runWithEffects(
      response: Request => Response,
      stage: Stage,
      zuoraEnvironment: ZuoraEnvironment,
      fetchString: StringFromS3,
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
  ): Unit = {
    val attempt = for {
      zuoraRestConfig <- LoadConfigModule(zuoraEnvironment.stageToLoad, fetchString).load[ZuoraRestConfig].left.map(_.error)
      zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      fetchCatalogAttempt <- ZuoraReadCatalog(zuoraRequests).toDisjunction.left.map(_.message)
      _ <- S3UploadCatalog(stage, zuoraEnvironment, fetchCatalogAttempt, s3Write)
    } yield ()
    attempt.fold(failureReason => throw CatalogServiceException(failureReason), identity)
  }

  case class CatalogServiceException(message: String) extends Throwable(message: String)

}
