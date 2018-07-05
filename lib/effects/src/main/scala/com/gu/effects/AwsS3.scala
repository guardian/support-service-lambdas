package com.gu.effects

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{GetObjectRequest, PutObjectRequest, PutObjectResult, S3ObjectInputStream}
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import scala.io.Source
import scala.util.{Failure, Success, Try}
import scalaz.{-\/, \/, \/-}

object S3ConfigLoad extends Logging {

  // if you are updating the config, it's hard to test it in advance of deployment
  // with this, you can upload the new config with a new name
  val version = "4"

  def load(stage: Stage): ConfigFailure \/ String = {
    val key =
      if (stage.value == "DEV")
        s"payment-failure-lambdas.private.json"
      else
        s"payment-failure-lambdas.private.v$version.json"
    load(stage, key)
  }

  def load(stage: Stage, key: String): ConfigFailure \/ String = {
    logger.info(s"Attempting to load config in $stage")
    val bucket = s"gu-reader-revenue-private/membership/payment-failure-lambdas/${stage.value}"
    val request = new GetObjectRequest(bucket, key)
    GetFromS3.fetchString(request) match {
      case Success(conf) => \/-(conf)
      case Failure(ex) =>
        logger.error(s"Failed to load config", ex)
        -\/(ConfigFailure("Failed to load config from S3"))
    }
  }

}

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
  //  type StringFromS3 = (String, String) => Try[String]
  //
  //  def fetchString: StringFromS3 = (bucket: String, key: String) => {
  //    val request = new GetObjectRequest(bucket, key)
  //    fetchString(request)
  //  }

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
