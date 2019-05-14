package com.gu.zuoragwholidaystop

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

case class ZuoraAccess(baseUrl: String, username: String, password: String)

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
    stage match {
      case "PROD" =>
        configFromS3("PROD") map { secretConfig =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = ???,
            holidayCreditProductRatePlanChargeId = ???
          )
        }
      case "UAT" =>
        configFromS3("CODE") map { secretConfig =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = ???,
            holidayCreditProductRatePlanChargeId = ???
          )
        }
      case "DEV" =>
        configFromS3("DEV") map { secretConfig =>
          Config(
            secretConfig,
            holidayCreditProductRatePlanId = "2c92c0f9671686a201671d14b5e5771e",
            holidayCreditProductRatePlanChargeId =
              "2c92c0f9671686ae01671d16ff8f6cd2"
          )
        }
    }
  }
}
