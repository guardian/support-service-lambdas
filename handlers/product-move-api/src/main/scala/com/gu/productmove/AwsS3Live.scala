package com.gu.productmove

import com.gu.productmove
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
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

  private def impl(creds: AwsCredentialsProvider): S3Client =
    S3Client
      .builder()
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()

}

private class AwsS3Live(s3Client: S3Client) extends AwsS3:

  override def getObject(bucket: String, key: String): ZIO[Any, ErrorResponse, String] =
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
      .mapError(e => InternalServerError(e.toString))

trait AwsS3 {
  def getObject(bucket: String, key: String): ZIO[Any, ErrorResponse, String]
}
object AwsS3 {
  def getObject(bucket: String, key: String): ZIO[AwsS3, ErrorResponse, String] =
    ZIO.environmentWithZIO[AwsS3](_.get.getObject(bucket, key))
}
