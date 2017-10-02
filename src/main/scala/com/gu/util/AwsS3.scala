package com.gu.util

import com.amazonaws.services.s3.AmazonS3ClientBuilder
import com.amazonaws.services.s3.model.{ GetObjectRequest, S3ObjectInputStream }
import scala.io.Source
import scala.util.Try

object AwsS3 extends Logging {

  val client = AmazonS3ClientBuilder.defaultClient

  def fetchContent(request: GetObjectRequest): Try[S3ObjectInputStream] = {
    logger.info(s"Getting file from S3. Bucket: ${request.getBucketName} | Key: ${request.getKey}")
    Try(client.getObject(request).getObjectContent)
  }

  def fetchString(request: GetObjectRequest): Try[String] = {
    for {
      s3Stream <- fetchContent(request)
      contentString <- Try(Source.fromInputStream(s3Stream).mkString)
      _ <- Try(s3Stream.close())
    } yield contentString
  }

}
