package com.gu.holidaystopbackfill

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions.EU_WEST_1
import com.amazonaws.services.s3.AmazonS3Client
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

object Config {

  private def salesforceCredentials(stage: String): Either[ConfigFailure, SFAuthConfig] = {
    val profileName = "membership"
    val bucketName = "gu-reader-revenue-private"
    val key =
      if (stage == "DEV")
        s"membership/support-service-lambdas/$stage/sfAuth-$stage.json"
      else
        s"membership/support-service-lambdas/$stage/sfAuth-$stage.v1.json"
    val builder =
      if (stage == "DEV")
        AmazonS3Client.builder
          .withCredentials(new ProfileCredentialsProvider(profileName))
          .withRegion(EU_WEST_1)
      else AmazonS3Client.builder
    val inputStream =
      builder.build().getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[SFAuthConfig](rawJson).left map { e =>
      ConfigFailure(s"Could not read secret config file from S3://$bucketName/$key: ${e.toString}")
    }
  }

  def apply(): Either[ConfigFailure, SFAuthConfig] = {
    val stage = Option(System.getenv("Stage")).getOrElse("DEV")
    for {
      sfConfig <- salesforceCredentials(stage)
    } yield sfConfig
  }
}
