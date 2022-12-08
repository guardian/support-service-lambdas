package com.gu.zuora.rer

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import circeCodecs._
import com.gu.zuora.rer.BatonModels.{Completed, Failed, Pending, RerStatusResponse}
import BatonModels.{Completed, Failed, Pending, RerInitiateRequest, RerInitiateResponse, RerStatusRequest, RerStatusResponse}
import io.circe.ParsingFailure
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class ZuoraRerHandlerSpec extends AnyFreeSpec with Matchers {
  val mockConfig: ZuoraRerConfig = ConfigLoader.getRerLambdaConfigTemp

  "ZuoraRerLambda" - {

    "should throw parsingException if called initiate with invalid json" in {
      val lambda = ZuoraRerHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val invalidRequest = "hello"
      assertThrows[ParsingFailure](invokeWithString(lambda, invalidRequest))
    }

    "should return a RerStatusResponse when passed a status request" in {
      val lambda = ZuoraRerHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val statusRequest = RerStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync()
        .isInstanceOf[RerStatusResponse] shouldBe true
    }

    "should return completed status upon successful completion" in {
      val lambda = ZuoraRerHandler(S3HelperStub.withSuccessResponse, mockConfig)
      val statusRequest = RerStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe RerStatusResponse(
          status = Completed,
          resultLocations = Some(List("s3Location"))
        )
    }

    "should return failed status upon unsuccessful completion" in {
      val lambda = ZuoraRerHandler(S3HelperStub.withFailedResponse, mockConfig)
      val statusRequest = RerStatusRequest("initiationReference")

      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe RerStatusResponse(status = Failed)
    }

    "should return pending status when found to be neither success nor failure" in {
      val lambda = ZuoraRerHandler(S3HelperStub.withPendingResponse, mockConfig)
      val statusRequest = RerStatusRequest("initiationReference")
      lambda
        .handle(statusRequest)
        .unsafeRunSync() shouldBe RerStatusResponse(status = Pending)
    }

    def invokeWithString(
                          lambda: ZuoraRerHandler,
                          request: String
    ): String = {
      val testInputStream = new ByteArrayInputStream(request.getBytes)
      val testOutputStream = new ByteArrayOutputStream()
      lambda.handleRequest(testInputStream, testOutputStream)
      new String(testOutputStream.toByteArray)
    }

  }
}
