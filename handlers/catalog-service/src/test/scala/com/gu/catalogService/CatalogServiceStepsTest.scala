package com.gu.catalogService

import com.gu.catalogService.Handler.CatalogServiceException
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.effects.S3Location
import com.gu.util.config.{Stage, ZuoraEnvironment}
import com.gu.util.zuora.ZuoraRestConfig

import scala.util.{Failure, Try}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CatalogServiceStepsTest extends AnyFlatSpec with Matchers {

  val successfulResponseEffects = new TestingRawEffects(200)
  val failureResponseEffects = new TestingRawEffects(500)

  it should "load the correct stage catalog" in {

    def validatingStringFromS3(s3Location: S3Location): Try[String] = Try {
      val zuoraLocation = ZuoraRestConfig.location
      val uatlocation =
        s"membership/support-service-lambdas/CODE/${zuoraLocation.path}-CODE.v${zuoraLocation.version}.json"
      val expectedS3Location = S3Location("gu-reader-revenue-private", uatlocation)
      if (s3Location != expectedS3Location)
        throw new RuntimeException(s"test failure : unexpected s3Location $s3Location expected $expectedS3Location")
      else
        """
       {
       |"stage" : "CODE",
       |"baseUrl": "https://ddd",
       | "username": "e@f.com",
       | "password": "ggg"
       |}
      """.stripMargin
    }

    noException should be thrownBy {
      Handler.runWithEffects(
        successfulResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("UAT"),
        validatingStringFromS3,
        TestingRawEffects.successfulS3Upload,
      )
    }
  }
  it should "throw a CatalogServiceException if the config cannot be loaded" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        successfulResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        _ => Failure(new RuntimeException("broken config load")),
        TestingRawEffects.successfulS3Upload,
      )
    }
  }

  it should "throw a CatalogServiceException if the call to fetch the catalog fails" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        failureResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        FakeFetchString.fetchString,
        TestingRawEffects.successfulS3Upload,
      )
    }
  }

  it should "throw a CatalogServiceException if the catalog cannot be uploaded to S3" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        successfulResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        FakeFetchString.fetchString,
        TestingRawEffects.failedS3Upload,
      )
    }
  }

}
