package com.gu.sf_datalake_export.util

import com.gu.effects.{BucketName, S3Path}
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.util.config.Stage

object ExportS3Path {

  def camelToHyphenCase(camelCaseString: String): String = {
    val beforeUpperCase = "(?=[A-Z])"
    camelCaseString.split(beforeUpperCase).mkString("-").toLowerCase()
  }

  def apply(stage: Stage)(objectName: ObjectName, uploadToDataLake: ShouldUploadToDataLake): S3Path = stage match {
// A separate case is needed for the salesforce-case data due to problems in S3 requiring a new destination bucket
    case Stage("PROD") if uploadToDataLake.value && objectName.value == "Case" =>
      S3Path(BucketName(s"ophan-raw-salesforce-${camelToHyphenCase(objectName.value)}v2"), None)
    case Stage("PROD") if uploadToDataLake.value =>
      S3Path(BucketName(s"ophan-raw-salesforce-${camelToHyphenCase(objectName.value)}"), None)
    case Stage(stageName) => S3Path(BucketName(s"gu-salesforce-export-${stageName.toLowerCase}"), None)
  }
}
