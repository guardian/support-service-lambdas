package com.gu.productmove

import com.gu.productmove
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import zio.{IO, RIO, Task, ZIO, ZLayer}

object AwsS3Live {

  val layer: ZLayer[AwsCredentialsProvider, Throwable, AwsS3] =
    ZLayer.scoped {
      ZIO.fromAutoCloseable(
        ZIO.serviceWithZIO[AwsCredentialsProvider](creds =>
          IO.attempt(
            S3Client.builder()
              .region(Region.EU_WEST_1)
              .credentialsProvider(creds)
              .build()
          ))
      ).map(Service(_))
    }

  private class Service(s3Client: S3Client) extends AwsS3 {

    override def getObject(bucket: String, key: String): Task[String] = {

      ZIO.attempt {
        val objectRequest: GetObjectRequest = GetObjectRequest
          .builder()
          .key(key)
          .bucket(bucket)
          .build();
        val response = s3Client.getObjectAsBytes(objectRequest)
        response.asUtf8String()
      }

    }

  }

}

trait AwsS3 {

  def getObject(bucket: String, key: String): Task[String]

}
object AwsS3 {

  def getObject(bucket: String, key: String): RIO[AwsS3, String] = ZIO.environmentWithZIO[AwsS3](_.get.getObject(bucket, key))

}
