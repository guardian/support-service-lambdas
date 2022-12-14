package com.gu.zuora.sar

import com.gu.zuora.sar.BatonModels.{Completed, Failed, PerformSarRequest, PerformSarResponse, SarInitiateRequest}
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class ZuoraPerformSarHandlerSpec extends AnyFreeSpec with Matchers {
  val mockConfig: ZuoraSarConfig = ConfigLoader.getSarLambdaConfigTemp

  "ZuoraPerformSarLambda" - {
    val validPerformSarRequest = PerformSarRequest(
      initiationReference = "someRequestId",
      subjectEmail = "someSubjectEmail",
    )

    "should return a successful PerformSarResponse when a SAR runs successfully and writes to S3" in {
      val lambda =
        ZuoraPerformSarHandler(ZuoraSarServiceStub.withSuccessResponse, S3HelperStub.withSuccessResponse, mockConfig)
      val expectedResponse = PerformSarResponse(
        status = Completed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
      )
      lambda
        .handle(validPerformSarRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformSarResponse when request is successful but upload to S3 is unsuccessful" in {
      val lambda =
        ZuoraPerformSarHandler(ZuoraSarServiceStub.withSuccessResponse, S3HelperStub.withFailedResponse, mockConfig)
      val expectedResponse = PerformSarResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = Some("S3Error(couldn't write to s3)"),
      )

      lambda
        .handle(validPerformSarRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformSarResponse when Zuora contacts can't be retrieved" in {
      val lambda = ZuoraPerformSarHandler(
        ZuoraSarServiceStub.withFailedContactResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformSarResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = Some("ZuoraClientError(Failed to get contacts)"),
      )

      lambda
        .handle(validPerformSarRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformSarResponse when unable to retrieve account data" in {
      val lambda = ZuoraPerformSarHandler(
        ZuoraSarServiceStub.withFailedAccountResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformSarResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = Some("ZuoraClientError(client error)"),
      )

      lambda
        .handle(validPerformSarRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformSarResponse when unable to retrieve invoice data" in {
      val lambda = ZuoraPerformSarHandler(
        ZuoraSarServiceStub.withFailedInvoiceResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val expectedResponse = PerformSarResponse(
        status = Failed,
        initiationReference = "someRequestId",
        subjectEmail = "someSubjectEmail",
        message = Some("JsonDeserialisationError(failed to deserialise invoices)"),
      )

      lambda
        .handle(validPerformSarRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }

    "should return a failed PerformSarResponse when PerformSarRequest can't be decoded" in {
      val lambda = ZuoraPerformSarHandler(
        ZuoraSarServiceStub.withFailedInvoiceResponse,
        S3HelperStub.withSuccessResponse,
        mockConfig,
      )
      val invalidRequest = SarInitiateRequest(subjectEmail = "someSubjectEmail")
      val expectedResponse = PerformSarResponse(
        status = Failed,
        initiationReference = "",
        subjectEmail = "",
        message = Some("Unable to retrieve email and initiation reference from request"),
      )

      lambda
        .handle(invalidRequest)
        .unsafeRunSync() shouldBe expectedResponse
    }
  }
}
