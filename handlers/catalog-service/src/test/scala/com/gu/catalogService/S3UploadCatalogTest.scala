package com.gu.catalogService

import com.gu.effects.{LocalFile, UploadToS3}
import com.gu.test.EffectsTest
import com.gu.util.Stage
import org.scalatest.FlatSpec

class S3UploadCatalogEffectsTest extends FlatSpec {

  "S3UploadCatalog" should "upload a file" taggedAs EffectsTest in {
    val attempt = S3UploadCatalog(Stage("EffectsTest"), """{"catalog":"myProducts"}""", LocalFile.create, UploadToS3.putObject)
    assert(attempt.isRight)
  }

}
