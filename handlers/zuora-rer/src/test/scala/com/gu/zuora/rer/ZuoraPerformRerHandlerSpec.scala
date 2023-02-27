package com.gu.zuora.rer

import com.gu.zuora.rer.BatonModels.{Completed, Failed}
import BatonModels.{PerformRerRequest, PerformRerResponse, RerInitiateRequest}
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class ZuoraPerformRerHandlerSpec extends AnyFreeSpec with Matchers {
  val mockConfig: ZuoraRerConfig = ConfigLoader.getRerLambdaConfigTemp

  "ZuoraPerformRerLambda" - {
    val validPerformRerRequest = PerformRerRequest(
      initiationReference = "someRequestId",
      subjectEmail = "someSubjectEmail",
    )

    "should return a successful PerformRerResponse when a RER runs successfully and writes to S3" in {
      val lambda =
        ZuoraPerformRerHandler(ZuoraRerServiceStub.withSuccessResponse, S3HelperStub.withSuccessResponse, mockConfig)
      val expectedResponse = PerformRerResponse(
        initiationReference = "someRequestId",
        message = "Successfully scrubbed account(s): 123456789",
        status = Completed,
        subjectEmail = "someSubjectEmail",
      )
      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformRerResponse when request is successful but upload to S3 is unsuccessful" in {
      val lambda =
        ZuoraPerformRerHandler(ZuoraRerServiceStub.withSuccessResponse, S3HelperStub.withFailedResponse, mockConfig)
      val expectedResponse = PerformRerResponse(
        initiationReference = "someRequestId",
        message = "S3Error(couldn't write to s3)",
        status = Failed,
        subjectEmail = "someSubjectEmail",
      )

      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformRerResponse when Zuora contacts can't be retrieved" in {
      val lambda = ZuoraPerformRerHandler(
        ZuoraRerServiceStub.withFailedContactResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformRerResponse(
        initiationReference = "someRequestId",
        message = "ZuoraClientError(Failed to get contacts)",
        status = Failed,
        subjectEmail = "someSubjectEmail",
      )

      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a successful PerformRerResponse when no Zuora contacts match the subject email" in {
      val lambda =
        ZuoraPerformRerHandler(ZuoraRerServiceStub.withNoContactsResponse, S3HelperStub.withSuccessResponse, mockConfig)
      val expectedResponse = PerformRerResponse(
        initiationReference = "someRequestId",
        message = "No accounts found with requested subject email",
        status = Completed,
        subjectEmail = "someSubjectEmail",
      )

      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
      //
    }

    "should return a failed PerformRerResponse when unable to verify that account data is ready for deletion" in {
      val lambda = ZuoraPerformRerHandler(
        ZuoraRerServiceStub.withFailedVerifyErasureResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformRerResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = "PreconditionCheckError(pre-condition checks failed)",
      )

      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformRerResponse when unable to scrub account data" in {
      val lambda = ZuoraPerformRerHandler(
        ZuoraRerServiceStub.withFailedScrubAccountResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformRerResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = "ZuoraClientError(scrub account error)",
      )

      lambda
        .handle(validPerformRerRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformRerResponse when PerformRerRequest can't be decoded" in {
      val lambda =
        ZuoraPerformRerHandler(ZuoraRerServiceStub.withSuccessResponse, S3HelperStub.withSuccessResponse, mockConfig)
      val invalidRequest = RerInitiateRequest(subjectEmail = "someSubjectEmail")
      val expectedResponse = PerformRerResponse(
        initiationReference = "",
        message = "Unable to retrieve email and initiation reference from request",
        status = Failed,
        subjectEmail = "",
      )

      lambda
        .handle(invalidRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }
  }
}
