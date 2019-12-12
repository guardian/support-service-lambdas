package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream

import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest, PutObjectResult}

import scala.io.Source

object BucketHelpers {

  private val s3Client = AmazonS3Client.builder.build

  private val bucketName = s"fulfilment-date-calculator-${System.getenv("Stage").toLowerCase}"

  def write(key: String, content: String): PutObjectResult =
    s3Client.putObject(putRequestWithAcl(key, content))

  def read(key: String) = Source.fromInputStream(s3Client.getObject(bucketName, key).getObjectContent).mkString

  private def putRequestWithAcl(key: String, content: String): PutObjectRequest =
    new PutObjectRequest(
      bucketName,
      key,
      new ByteArrayInputStream(content.getBytes),
      new ObjectMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)

}
