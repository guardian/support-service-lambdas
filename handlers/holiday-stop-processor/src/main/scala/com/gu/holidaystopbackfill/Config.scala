package com.gu.holidaystopbackfill

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions.EU_WEST_1
import com.amazonaws.services.s3.AmazonS3Client
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

case class Config(
  zuoraConfig: ZuoraConfig,
  sfConfig: SFAuthConfig
)

case class ZuoraConfig(
  baseUrl: String,
  holidayStopProcessor: HolidayStopProcessor
)

case class HolidayStopProcessor(oauth: Oauth)

case class Oauth(clientId: String, clientSecret: String)

object Config {

  private def zuoraCredentials(stage: String): Either[ConfigFailure, ZuoraConfig] =
    credentials[ZuoraConfig](stage, "zuoraRest")

  private def salesforceCredentials(stage: String): Either[ConfigFailure, SFAuthConfig] =
    credentials[SFAuthConfig](stage, "sfAuth")

  private def credentials[T](stage: String, filePrefix: String)(implicit evidence: Decoder[T]): Either[ConfigFailure, T] = {
    val profileName = "membership"
    val bucketName = "gu-reader-revenue-private"
    val key =
      if (stage == "DEV")
        s"membership/support-service-lambdas/$stage/$filePrefix-$stage.json"
      else
        s"membership/support-service-lambdas/$stage/$filePrefix-$stage.v1.json"
    val builder =
      if (stage == "DEV")
        AmazonS3Client.builder
          .withCredentials(new ProfileCredentialsProvider(profileName))
          .withRegion(EU_WEST_1)
      else AmazonS3Client.builder
    val inputStream =
      builder.build().getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[T](rawJson).left map { e =>
      ConfigFailure(s"Could not read secret config file from S3://$bucketName/$key: ${e.toString}")
    }
  }

  def apply(): Either[ConfigFailure, Config] = {
    val stage = Option(System.getenv("Stage")).getOrElse("DEV")
    for {
      zuoraConfig <- zuoraCredentials(stage)
      sfConfig <- salesforceCredentials(stage)
    } yield Config(zuoraConfig, sfConfig)
  }
}
