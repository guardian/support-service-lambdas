package com.gu.supporter.fulfilment

import com.gu.effects.{GetFromS3, S3Location, UploadToS3}
import software.amazon.awssdk.services.s3.model.{ObjectCannedACL, PutObjectResponse}

object BucketHelpers {
  def write(s3Location: S3Location, content: String): PutObjectResponse =
    UploadToS3.putString(s3Location, content).get

  def read(s3Location: S3Location) =
    GetFromS3.fetchString(s3Location).get
}
