package com.gu.zuora.sar

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import circeCodecs._
import com.gu.zuora.sar.BatonModels.{
  Completed,
  Failed,
  Pending,
  SarInitiateRequest,
  SarInitiateResponse,
  SarStatusRequest,
  SarStatusResponse,
}
import io.circe.ParsingFailure
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class ZuoraSarHandlerSpec extends AnyFreeSpec with Matchers {
  val mockConfig: ZuoraSarConfig = ConfigLoader.getSarLambdaConfigTemp

  "ZuoraSarLambda" - {

    "should throw parsingException if called initiate with invalid json" in {
      val lambda = ZuoraSarHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val invalidRequest = "hello"
      assertThrows[ParsingFailure](invokeWithString(lambda, invalidRequest))
    }

    "should return a SarStatusResponse when passed a status request" in {
      val lambda = ZuoraSarHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val statusRequest = SarStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync()
        .isInstanceOf[SarStatusResponse] shouldBe true
    }

    "should return completed status upon successful completion" in {
      val lambda = ZuoraSarHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val statusRequest = SarStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe SarStatusResponse(
        status = Completed,
        resultLocations = Some(List("s3Location")),
      )
    }

    "should return failed status upon unsuccessful completion" in {
      val lambda = ZuoraSarHandler(S3HelperStub.withFailedResponse, mockConfig)
      val statusRequest = SarStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe SarStatusResponse(status = Failed)
    }

    "should return pending status when found to be neither success nor failure" in {
      val lambda = ZuoraSarHandler(S3HelperStub.withPendingResponse, mockConfig)
      val statusRequest = SarStatusRequest("initiationReference")
      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe SarStatusResponse(status = Pending)
    }

    def invokeWithString(
        lambda: ZuoraSarHandler,
        request: String,
    ): String = {
      val testInputStream = new ByteArrayInputStream(request.getBytes)
      val testOutputStream = new ByteArrayOutputStream()
      lambda.handleRequest(testInputStream, testOutputStream)
      new String(testOutputStream.toByteArray)
    }

  }
}
