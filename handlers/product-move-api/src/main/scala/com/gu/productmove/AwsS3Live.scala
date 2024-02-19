package com.gu.productmove

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import zio.{IO, RIO, Task, ZIO, ZLayer}

object AwsS3Live {

  val layer: ZLayer[AwsCredentialsProvider, Throwable, AwsS3] =
    ZLayer.scoped {
      for {
        creds <- ZIO.service[AwsCredentialsProvider]
        s3Client <- ZIO.fromAutoCloseable(ZIO.attempt(impl(creds)))
      } yield AwsS3Live(s3Client)
    }

  def impl(creds: AwsCredentialsProvider): S3Client =
    S3Client
      .builder()
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()

}

class AwsS3Live(s3Client: S3Client) extends AwsS3:

  override def getObject(bucket: String, key: String): Task[String] =
    ZIO
      .attempt {
        val objectRequest: GetObjectRequest = GetObjectRequest
          .builder()
          .key(key)
          .bucket(bucket)
          .build();
        val response = s3Client.getObjectAsBytes(objectRequest)
        response.asUtf8String()
      }

trait AwsS3 {
  def getObject(bucket: String, key: String): Task[String]
}
