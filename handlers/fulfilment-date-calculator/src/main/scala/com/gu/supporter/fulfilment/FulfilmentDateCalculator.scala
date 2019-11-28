package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.typesafe.scalalogging.LazyLogging
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

class FulfilmentDateCalculator extends Lambda[String, String] with LazyLogging {
  override def handle(todayOverride: String, context: Context) = {
    writeToBucket("changeme.json", """{ "foo": 42 }""")
    Right(todayOverride)
  }

  private def writeToBucket(filename: String, content: String) = {
    val s3Client = AmazonS3Client.builder.build
    val stage = System.getenv("Stage").toLowerCase
    val requestWithAcl = putRequestWithAcl(s"fulfilment-date-calculator-$stage", filename, content)
    s3Client.putObject(requestWithAcl)
  }

  private def putRequestWithAcl(bucket: String, key: String, content: String): PutObjectRequest =
    new PutObjectRequest(
      bucket,
      key,
      new ByteArrayInputStream(content.getBytes),
      new ObjectMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)
}

