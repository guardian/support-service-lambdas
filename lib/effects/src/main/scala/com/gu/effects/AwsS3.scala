package com.gu.effects

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{GetObjectRequest, PutObjectRequest, PutObjectResult, S3ObjectInputStream}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule.S3Location

import scala.io.Source
import scala.util.{Failure, Success, Try}

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

object AwsS3 {

  val client = AmazonS3Client.builder.withCredentials(aws.CredentialsProvider).build()

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
