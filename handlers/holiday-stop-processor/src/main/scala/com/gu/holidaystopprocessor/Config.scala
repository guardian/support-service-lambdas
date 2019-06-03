package com.gu.holidaystopprocessor

import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions.EU_WEST_1
import com.amazonaws.services.s3.{AmazonS3Client, AmazonS3ClientBuilder}
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

case class Config(
  zuoraAccess: ZuoraAccess,
  holidayCreditProductRatePlanId: String,
  holidayCreditProductRatePlanChargeId: String
)

object Config {

  private def configFromS3(stage: String): Either[String, ZuoraAccess] = {
    val profileName = "membership"
    val bucketName = "gu-reader-revenue-private"
    val key =
      if (stage == "DEV")
        s"membership/support-service-lambdas/$stage/zuoraRest-$stage.json"
      else
        s"membership/support-service-lambdas/$stage/zuoraRest-$stage.v1.json"
    val builder: AmazonS3ClientBuilder =
      if (stage == "DEV")
        AmazonS3Client.builder
          .withCredentials(new ProfileCredentialsProvider(profileName))
          .withRegion(EU_WEST_1)
      else AmazonS3Client.builder
    val inputStream =
      builder.build().getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[ZuoraAccess](rawJson).left map { e =>
      s"Could not read secret config file from S3://$bucketName/$key: ${e.toString}"
    }
  }

  def apply(): Either[String, Config] = {
    val stage = Option(System.getenv("Stage")).getOrElse("DEV")
    configFromS3(stage) map { secretConfig =>
      stage match {
        case "PROD" =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = "2c92a0076ae9189c016b080c930a6186",
            holidayCreditProductRatePlanChargeId =
              "2c92a0086ae928d7016b080f638477a6"
          )
        case "CODE" =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
            holidayCreditProductRatePlanChargeId =
              "2c92c0f86b0378b0016b08112ec70d14"
          )
        case "DEV" =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
            holidayCreditProductRatePlanChargeId =
              "2c92c0f96b03800b016b081fc0f41bb4"
          )
      }
    }
  }
}
