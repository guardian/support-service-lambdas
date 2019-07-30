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
    val key = s"membership/support-service-lambdas/$stage/sfHolidayStopBackfillAuth-$stage.json"
    val builder =
      AmazonS3Client.builder
        .withCredentials(new ProfileCredentialsProvider(profileName))
        .withRegion(EU_WEST_1)
    val inputStream =
      builder.build().getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[SFAuthConfig](rawJson).left map { e =>
      ConfigFailure(s"Could not read secret config file from S3://$bucketName/$key: ${e.toString}")
    }
  }

  def apply(stage: String): Either[ConfigFailure, SFAuthConfig] = salesforceCredentials(stage)
}
