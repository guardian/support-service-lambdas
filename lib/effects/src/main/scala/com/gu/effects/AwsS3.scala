package com.gu.effects

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model._
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule.S3Location

import scala.collection.JavaConverters._
import scala.io.Source
import scala.util.{Failure, Try}

object GetFromS3 extends Logging {

  def fetchContent(request: GetObjectRequest): Try[S3ObjectInputStream] = {
    logger.info(s"Getting file from S3. Bucket: ${request.getBucketName} | Key: ${request.getKey}")
    val contentRequest = Try(AwsS3.client.getObject(request).getObjectContent)
    contentRequest.recoverWith {
      case ex => {
        logger.error(s"Failed to fetch config from S3 due to: ${ex.getMessage}")
        Failure(ex)
      }
    }
  }
  def fetchString(s3Location: S3Location): Try[String] = {
    val request = new GetObjectRequest(s3Location.bucket, s3Location.key)
    fetchString(request)
  }

  def fetchString(request: GetObjectRequest): Try[String] = {
    for {
      s3Stream <- fetchContent(request)
      contentString <- Try(Source.fromInputStream(s3Stream).mkString)
      _ <- Try(s3Stream.close())
    } yield contentString
  }

}

object UploadToS3 extends Logging {

  def putObject(request: PutObjectRequest): Try[PutObjectResult] = {
    logger.info(s"Copying file to S3. Bucket: ${request.getBucketName} | Key: ${request.getKey}")
    val uploadRequest = Try(AwsS3.client.putObject(request))
    uploadRequest
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

object ListS3Objects extends Logging {

  def listObjectsWithPrefix(prefix: S3Path): Try[List[Key]] = {
    Try {
      val response = AwsS3.client.listObjects(prefix.bucketName.value, prefix.key.map(_.value).getOrElse(""))
      val objSummaries = response.getObjectSummaries.asScala.toList
      objSummaries.map(objSummary => Key(objSummary.getKey))
    }
  }
}

object DeleteS3Objects extends Logging {

  def deleteObjects(bucketName: BucketName, keysToDelete: List[Key]): Try[Unit] = {
    Try {
      val s3Keys = keysToDelete.map(_.value)
      val req = new DeleteObjectsRequest(bucketName.value)
        .withKeys(s3Keys: _*)
        .withQuiet(false)
      AwsS3.client.deleteObjects(req)
    }
  }
}
object AwsS3 {

  val client = AmazonS3Client.builder
    .withCredentials(aws.CredentialsProvider)
    .withRegion(Regions.EU_WEST_1)
    .build()

}

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new EnvironmentVariableCredentialsProvider,
    new SystemPropertiesCredentialsProvider,
    new ProfileCredentialsProvider(ProfileName),
    new InstanceProfileCredentialsProvider(false),
    new EC2ContainerCredentialsProviderWrapper
  )

}
