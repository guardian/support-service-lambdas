package com.gu.catalogService

import com.gu.catalogService.Handler.CatalogServiceException
import com.gu.effects.TestingRawEffects
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Stage, ZuoraEnvironment}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.-\/

class CatalogServiceStepsTest extends FlatSpec with Matchers {

  val successfulResponseEffects = new TestingRawEffects(200)
  val failureResponseEffects = new TestingRawEffects(500)

  it should "throw a CatalogServiceException if the config cannot be loaded" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        successfulResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        _ => -\/(ConfigFailure("broken config load")),
        TestingRawEffects.successfulS3Upload
      )
    }
  }

  it should "throw a CatalogServiceException if the call to fetch the catalog fails" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        failureResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        TestingRawEffects.s3Load,
        TestingRawEffects.successfulS3Upload
      )
    }
  }

  it should "throw a CatalogServiceException if the catalog cannot be uploaded to S3" in {
    a[CatalogServiceException] should be thrownBy {
      Handler.runWithEffects(
        successfulResponseEffects.response,
        Stage("DEV"),
        ZuoraEnvironment("DEV"),
        TestingRawEffects.s3Load,
        TestingRawEffects.failedS3Upload
      )
    }
  }

}
