package com.gu.catalogService

import java.util.Date
import com.gu.effects.{AwsS3, UploadToS3}
import com.gu.test.EffectsTest
import com.gu.util.Logging
import com.gu.util.config.Stage
import org.scalatest.FlatSpec
import scala.util.Try

class S3UploadCatalogEffectsTest extends FlatSpec with Logging {

  def getLatestCatalogTimestamp: Try[Date] = Try(AwsS3.client.getObjectMetadata("gu-zuora-catalog/EffectsTest", "catalog.json").getLastModified)

  "S3UploadCatalog" should "upload a file" taggedAs EffectsTest in {
    val readBefore = getLatestCatalogTimestamp
    S3UploadCatalog(Stage("EffectsTest"), """{"catalog":"myProducts"}""", UploadToS3.putObject)
    val readAfter = getLatestCatalogTimestamp
    val compareDates = for {
      beforeUpload <- readBefore
      afterUpload <- readAfter
    } yield afterUpload.after(beforeUpload)

    compareDates.fold(
      ex => assert(false), timestampUpdated => assert(timestampUpdated)
    )

  }

}
