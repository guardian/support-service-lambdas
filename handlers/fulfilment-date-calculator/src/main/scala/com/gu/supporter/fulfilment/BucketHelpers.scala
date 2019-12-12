package com.gu.supporter.fulfilment
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, S3Location, UploadToS3}

object BucketHelpers {
  def write(s3Location: S3Location, content: String): PutObjectResult =
    UploadToS3.putStringWithAcl(s3Location, CannedAccessControlList.BucketOwnerRead, content).get

  def read(s3Location: S3Location) =
    GetFromS3.fetchString(s3Location).get
}
