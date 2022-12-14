package com.gu.catalogService

import java.time.Instant

import com.gu.effects.{AwsS3, UploadToS3}
import com.gu.test.EffectsTest
import com.gu.util.Logging
import com.gu.util.config.{Stage, ZuoraEnvironment}
import software.amazon.awssdk.services.s3.model.GetObjectRequest

import scala.util.Try
import org.scalatest.flatspec.AnyFlatSpec

class S3UploadCatalogEffectsTest extends AnyFlatSpec with Logging {

  private def getLatestCatalogTimestamp: Try[Instant] = Try(
    AwsS3.client
      .getObject(
        GetObjectRequest.builder
          .bucket("gu-zuora-catalog")
          .key("EffectsTest/Zuora-FakeEnv/catalog.json")
          .build(),
      )
      .response
      .lastModified,
  )

  "S3UploadCatalog" should "upload a file" taggedAs EffectsTest in {
    val readBefore = getLatestCatalogTimestamp
    S3UploadCatalog(
      Stage("EffectsTest"),
      ZuoraEnvironment("FakeEnv"),
      """{"catalog":"myProducts"}""",
      UploadToS3.putObject,
    )
    val readAfter = getLatestCatalogTimestamp
    val compareDates = for {
      beforeUpload <- readBefore
      afterUpload <- readAfter
    } yield afterUpload.isAfter(beforeUpload)

    compareDates.fold(
      ex => assert(false),
      timestampUpdated => assert(timestampUpdated),
    )

  }

}
