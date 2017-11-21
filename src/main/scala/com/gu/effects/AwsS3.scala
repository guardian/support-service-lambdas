package com.gu.effects

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{ GetObjectRequest, S3ObjectInputStream }
import com.gu.util.{ Logging, Stage }

import scala.io.Source
import scala.util.{ Failure, Try }

object ConfigLoad extends Logging {

  // if you are updating the config, it's hard to test it in advance of deployment
  // with this, you can upload the new config with a new name
  val version = "2"

  def load(stage: Stage): Try[String] = {
    logger.info(s"Attempting to load config in $stage")
    val bucket = s"payment-failure-lambdas-private/${stage.value}"
    val key = s"payment-failure-lambdas.private.v$version.json"
    val request = new GetObjectRequest(bucket, key)
    AwsS3.fetchString(request)
  }

}

object AwsS3 extends Logging {

  val client = AmazonS3Client.builder.withCredentials(aws.CredentialsProvider).build()

  def fetchContent(request: GetObjectRequest): Try[S3ObjectInputStream] = {
    logger.info(s"Getting file from S3. Bucket: ${request.getBucketName} | Key: ${request.getKey}")
    val contentRequest = Try(client.getObject(request).getObjectContent)
    contentRequest.recoverWith {
      case ex => {
        logger.error(s"Failed to fetch config from S3 due to: ${ex.getMessage}")
        Failure(ex)
      }
    }
  }

  def fetchString(request: GetObjectRequest): Try[String] = {
    for {
      s3Stream <- fetchContent(request)
      contentString <- Try(Source.fromInputStream(s3Stream).mkString)
      _ <- Try(s3Stream.close())
    } yield contentString
  }

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