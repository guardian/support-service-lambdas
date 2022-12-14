package com.com.gu.sf_datalake_export

import com.gu.effects.{BucketName, S3Path}
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams
import com.gu.sf_datalake_export.util.ExportS3Path
import com.gu.util.config.Stage
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ExportS3PathTest extends AnyFlatSpec with Matchers {
  "uploadBasePath" should "return ophan bucket basepath for PROD requests with uploadToDataLake enabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = ExportS3Path(Stage("PROD"))(contactName, ShouldUploadToDataLake(true))
    actualBasePath shouldBe S3Path(BucketName("ophan-raw-salesforce-contact"), None)
  }

  it should "return test bucket basepath for PROD requests with uploadToDataLake disabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = ExportS3Path(Stage("PROD"))(contactName, ShouldUploadToDataLake(false))
    actualBasePath shouldBe S3Path(BucketName("gu-salesforce-export-prod"), None)
  }

  it should "return test bucket basepath for non PROD requests regardless of the uploadToDataLake param" in {
    val contactName = BulkApiParams.contact.objectName
    val codeBasePath = ExportS3Path(Stage("CODE"))(contactName, ShouldUploadToDataLake(false))
    val codeBasePathUploadToDl = ExportS3Path(Stage("CODE"))(contactName, ShouldUploadToDataLake(false))
    List(codeBasePath, codeBasePathUploadToDl).distinct shouldBe List(
      S3Path(BucketName("gu-salesforce-export-code"), None),
    )
  }

  it should "convert object name to hyphen case in ophan raw bucket name if object name is camel case" in {
    val cardExpiryName = BulkApiParams.cardExpiry.objectName
    val actualBasePath = ExportS3Path(Stage("PROD"))(cardExpiryName, ShouldUploadToDataLake(true))
    actualBasePath shouldBe S3Path(BucketName("ophan-raw-salesforce-card-expiry"), None)
  }

}
