package com.gu.effects

import java.io.InputStream
import java.nio.charset.StandardCharsets

import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.auth.credentials.{
  AwsCredentialsProviderChain,
  EnvironmentVariableCredentialsProvider,
  ProfileCredentialsProvider,
  SystemPropertyCredentialsProvider,
}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model._

import scala.io.Source
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Try}

case class S3Location(bucket: String, key: String)

object GetFromS3 extends LazyLogging {

  def fetchContent(request: GetObjectRequest): Try[InputStream] = {
    logger.info(s"Getting file from S3. Bucket: ${request.bucket} | Key: ${request.key}")
    val contentRequest = Try(AwsS3.client.getObject(request))
    contentRequest.recoverWith { case ex =>
      logger.error(s"Failed to fetch config from S3 due to: ${ex.getMessage}")
      Failure(ex)
    }
  }

  def fetchString(s3Location: S3Location): Try[String] = {
    val request = GetObjectRequest.builder.bucket(s3Location.bucket).key(s3Location.key).build()
    fetchString(request)
  }

  private def fetchString(request: GetObjectRequest): Try[String] = {
    for {
      s3Stream <- fetchContent(request)
      contentString <- Try(Source.fromInputStream(s3Stream).mkString)
      _ <- Try(s3Stream.close())
    } yield contentString
  }

}

object UploadToS3 extends LazyLogging {

  def putObject(request: PutObjectRequest, body: RequestBody): Try[PutObjectResponse] = {
    logger.info(s"Copying file to S3. Bucket: ${request.bucket} | Key: ${request.key}")
    val uploadRequest = Try(AwsS3.client.putObject(request, body))
    uploadRequest
  }

  def putStringWithAcl(s3Location: S3Location, cannedAcl: ObjectCannedACL, content: String): Try[PutObjectResponse] = {
    putObject(
      PutObjectRequest.builder.bucket(s3Location.bucket).key(s3Location.key).acl(cannedAcl).build(),
      RequestBody.fromString(content, StandardCharsets.UTF_8),
    )
  }
}

case class S3Path(bucketName: BucketName, key: Option[Key])
object S3Path {
  def appendToPrefix(basePath: S3Path, suffix: String) = {
    val existingPrefixString = basePath.key.map(_.value).getOrElse("")
    val newPrefix = Key(s"${existingPrefixString}${suffix}")
    basePath.copy(key = Some(newPrefix))
  }
}
case class BucketName(value: String) extends AnyVal
case class Key(value: String) extends AnyVal

object ListS3Objects extends LazyLogging {

  def listObjectsWithPrefix(prefix: S3Path): Try[List[Key]] = {
    Try {
      val response = AwsS3.client.listObjects(
        ListObjectsRequest.builder
          .bucket(prefix.bucketName.value)
          .prefix(prefix.key.map(_.value).getOrElse(""))
          .build(),
      )
      val objects = response.contents.asScala.toList
      objects.map(objSummary => Key(objSummary.key))
    }
  }
}

object CopyS3Objects extends LazyLogging {

  private def copyObject(request: CopyObjectRequest): Try[CopyObjectResponse] = {
    logger.info(
      s"Copying file from ${request.copySource} to ${request.destinationBucket} | ${request.destinationKey}",
    )
    val copyRequest = Try(AwsS3.client.copyObject(request))
    copyRequest
  }

  def copyStringWithAcl(
      originS3Location: S3Location,
      destinationS3Location: S3Location,
      cannedAcl: ObjectCannedACL,
  ): Try[CopyObjectResponse] = {
    copyObject(
      CopyObjectRequest.builder
        .copySource(s"${originS3Location.bucket}/${originS3Location.key}")
        .destinationBucket(destinationS3Location.bucket)
        .destinationKey(destinationS3Location.key)
        .acl(cannedAcl)
        .build(),
    )
  }
}

object DeleteS3Objects extends LazyLogging {

  def deleteObjects(bucketName: BucketName, keysToDelete: List[Key]): Try[Unit] = {
    Try {
      val s3Keys = keysToDelete.map(key => ObjectIdentifier.builder.key(key.value).build())
      val req = DeleteObjectsRequest.builder
        .bucket(bucketName.value)
        .delete(
          Delete.builder.objects(s3Keys: _*).quiet(false).build(),
        )
        .build()
      AwsS3.client.deleteObjects(req)
    }
  }
}

object AwsS3 {

  val client: S3Client = S3Client.builder
    .credentialsProvider(aws.CredentialsProvider)
    .region(EU_WEST_1)
    .build()

}

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider: AwsCredentialsProviderChain = AwsCredentialsProviderChain.builder
    .credentialsProviders(
      EnvironmentVariableCredentialsProvider.create(),
      SystemPropertyCredentialsProvider.create(),
      ProfileCredentialsProvider.create(ProfileName),
    )
    .build()
}
