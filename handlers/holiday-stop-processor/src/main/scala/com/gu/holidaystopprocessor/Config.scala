package com.gu.holidaystopprocessor

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions.EU_WEST_1
import com.amazonaws.services.s3.AmazonS3Client
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

case class Config(
  zuoraCredentials: ZuoraAccess,
  sfCredentials: SFAuthConfig,
  holidayCreditProductRatePlanId: String,
  holidayCreditProductRatePlanChargeId: String
)

object Config {

  private def zuoraCredentials(stage: String): Either[String, ZuoraAccess] =
    credentials[ZuoraAccess](stage, "zuoraRest")

  private def salesforceCredentials(stage: String): Either[String, SFAuthConfig] =
    credentials[SFAuthConfig](stage, "sfAuth")

  private def credentials[T](stage: String, filePrefix: String)(implicit evidence: Decoder[T]): Either[String, T] = {
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
      s"Could not read secret config file from S3://$bucketName/$key: ${e.toString}"
    }
  }

  def apply(): Either[String, Config] = {
    val stage = Option(System.getenv("Stage")).getOrElse("DEV")
    for {
      zuoraCreds <- zuoraCredentials(stage)
      sfCreds <- salesforceCredentials(stage)
    } yield {
      stage match {
        case "PROD" =>
          Config(
            zuoraCreds,
            sfCreds,
            holidayCreditProductRatePlanId = "2c92a0fc5b42d2c9015b6259f7f40040",
            holidayCreditProductRatePlanChargeId =
              "2c92a00e6ad50f58016ad9ca59962c8c"
          )
        case "CODE" =>
          Config(
            zuoraCreds,
            sfCreds,
            holidayCreditProductRatePlanId = "2c92c0f96abaa1b5016abac99075461f",
            holidayCreditProductRatePlanChargeId =
              "2c92c0f96abc17d2016ac0da404d456c"
          )
        case "DEV" =>
          Config(
            zuoraCreds,
            sfCreds,
            holidayCreditProductRatePlanId = "2c92c0f9671686a201671d14b5e5771e",
            holidayCreditProductRatePlanChargeId =
              "2c92c0f96abb85c3016abbe5771b04cc"
          )
      }
    }
  }
}
