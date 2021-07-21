package com.gu.digital_voucher_cancellation_processor

import cats.effect.IO
import cats.syntax.all._
import com.gu.DevIdentity
import com.gu.digital_voucher_cancellation_processor.DigitalVoucherCancellationProcessorService._
import com.gu.imovo.ImovoStub._
import com.gu.imovo.{ImovoClientException, ImovoConfig, ImovoErrorResponse, ImovoSuccessResponse}
import com.gu.salesforce.sttp.SalesforceStub._
import com.gu.salesforce.sttp._
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import io.circe.generic.auto._
import org.scalatest.Inside.inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import sttp.client3.impl.cats.CatsMonadAsyncError
import sttp.client3.testing.SttpBackendStub

import java.time.{Clock, Instant, ZoneId}
import scala.concurrent.ExecutionContext

class DigitalVoucherCancellationProcessorServiceTest extends AnyFlatSpec with Matchers {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  val authConfig = SFAuthConfig(
    url = "https://unit-test.salesforce.com",
    client_id = "unit-test-client-id",
    client_secret = "unit-test-client-secret",
    username = "unit-tests@guardian.co.uk.dev",
    password = "unit-test-password",
    token = "unit-test-token"
  )

  val authResponse = SalesforceAuth(
    access_token = "unit-test-access-token",
    instance_url = "https://unit-test-instance-url.salesforce.com"
  )

  val imovoConfig = ImovoConfig("https://unit-test.imovo.com", "unit-test-imovo-api-key")

  val now = Instant.parse("2020-03-18T00:00:30.00Z")

  val testClock = Clock.fixed(now, ZoneId.systemDefault())

  def voucherToCancelQueryResult(resultId: String) = DigitalVoucherQueryResult(
    s"digital-voucher-id-$resultId",
    CObjectAttribues(s"/services/data/v29.0/sobjects/Digital_Voucher__c/digital-voucher-id-$resultId"),
    SubscriptionQueryResult(
      s"sf-subscription-id-$resultId",
      CObjectAttribues(s"/services/data/v29.0/sobjects/SF_Subscription__c/sf-subscription-id-$resultId")
    )
  )

  private def salesforceVoucherUpdate(resultId: String) = {
    SFApiCompositePart(
      s"digital-voucher-id-$resultId",
      "PATCH",
      s"/services/data/v29.0/sobjects/Digital_Voucher__c/digital-voucher-id-$resultId",
      DigitalVoucherUpdate(now, "Deactivated")
    )
  }

  "DigitalVoucherCancellationProcessor" should "query salesforce for subscriptions, call imovo to cancel sub " +
    "and update Cancellation_Process_On in SF" in {
      val salesforceBackendStub =
        SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
          .stubAuth(authConfig, authResponse)
          .stubQuery(
            auth = authResponse,
            query = subscriptionsCancelledTodayQuery,
            response = QueryRecordsWrapperCaseClass(
              List(
                voucherToCancelQueryResult("valid-sub-1"),
                voucherToCancelQueryResult("valid-sub-2")
              ),
              None
            )
          )
          .stubSubscriptionCancel(
            config = imovoConfig,
            subscriptionId = "sf-subscription-id-valid-sub-1",
            lastActiveDate = None,
            response = ImovoSuccessResponse("OK", true)
          )
          .stubSubscriptionCancel(
            config = imovoConfig,
            subscriptionId = "sf-subscription-id-valid-sub-2",
            lastActiveDate = None,
            response = ImovoSuccessResponse("OK", true)
          )
          .stubComposite(
            auth = authResponse,
            expectedRequest = Some(SFApiCompositeRequest(
              true,
              false,
              List(
                salesforceVoucherUpdate("valid-sub-1"),
                salesforceVoucherUpdate("valid-sub-2")
              )
            )),
            response = SFApiCompositeResponse(
              List(
                SFApiCompositeResponsePart(200, "VoucherUpdated"),
                SFApiCompositeResponsePart(200, "VoucherUpdated")
              )
            )
          )

      runApp(salesforceBackendStub, testClock) should ===(
        Right(
          ImovoCancellationResults(successfullyCancelled = List(
            voucherToCancelQueryResult("valid-sub-1"),
            voucherToCancelQueryResult("valid-sub-2")
          ))
        )
      )
    }

  it should "still update salesforce if subscription has already been cancelled in imovo" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          auth = authResponse,
          query = subscriptionsCancelledTodayQuery,
          response = QueryRecordsWrapperCaseClass(
            List(
              voucherToCancelQueryResult("valid-sub"),
              voucherToCancelQueryResult("already-cancelled")
            ),
            None
          )
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-valid-sub",
          lastActiveDate = None,
          response = ImovoSuccessResponse("OK", true)
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-already-cancelled",
          lastActiveDate = None,
          response = ImovoErrorResponse(
            List("Unable to cancel vouchers: no live subscription vouchers exist for the supplied subscription id"),
            false
          )
        )
        .stubComposite(
          auth = authResponse,
          expectedRequest = Some(SFApiCompositeRequest(
            true,
            false,
            List(
              salesforceVoucherUpdate("valid-sub"),
              salesforceVoucherUpdate("already-cancelled")
            )
          )),
          response = SFApiCompositeResponse(
            List(
              SFApiCompositeResponsePart(200, "VoucherUpdated"),
              SFApiCompositeResponsePart(200, "VoucherUpdated")
            )
          )
        )

    inside(runApp(salesforceBackendStub, testClock)) {
      case Left(DigitalVoucherCancellationProcessorAppError(message)) =>
        message should include("Some digital vouchers did not exist in imovo, they may have already been cancelled.")
        message should include(
          ImovoCancellationResults(
            successfullyCancelled = List(voucherToCancelQueryResult("valid-sub")),
            alreadyCancelled = List(voucherToCancelQueryResult("already-cancelled"))
          ).show
        )
    }
  }

  it should "not update salesforce if imovo request fails" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          auth = authResponse,
          query = subscriptionsCancelledTodayQuery,
          response = QueryRecordsWrapperCaseClass(
            List(
              voucherToCancelQueryResult("valid-sub"),
              voucherToCancelQueryResult("imovo-failure")
            ),
            None
          )
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-valid-sub",
          lastActiveDate = None,
          response = ImovoSuccessResponse("OK", true)
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-imovo-failure",
          lastActiveDate = None,
          response = ImovoErrorResponse(
            List("Unexpected error"),
            false
          )
        )
        .stubComposite(
          auth = authResponse,
          expectedRequest = Some(SFApiCompositeRequest(
            true,
            false,
            List(
              salesforceVoucherUpdate("valid-sub")
            )
          )),
          response = SFApiCompositeResponse(
            List(
              SFApiCompositeResponsePart(200, "VoucherUpdated")
            )
          )
        )

    runApp(salesforceBackendStub, testClock) should ===(
      Right(
        ImovoCancellationResults(
          successfullyCancelled = List(voucherToCancelQueryResult("valid-sub")),
          cancellationFailures = List(
            ImovoClientException(
              message =
                """Request GET https://unit-test.imovo.com/Subscription/CancelSubscriptionVoucher?SubscriptionId=sf-subscription-id-imovo-failure failed with response ({
                  |  "errorMessages" : [
                  |    "Unexpected error"
                  |  ],
                  |  "successfulRequest" : false
                  |})""".stripMargin,
              responseBody = Some(
                """{
                  |  "errorMessages" : [
                  |    "Unexpected error"
                  |  ],
                  |  "successfulRequest" : false
                  |}""".stripMargin
              )
            )
          )
        )
      )
    )
  }

  it should "successfully return empty results if there are no subscriptions to cancel" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          auth = authResponse,
          query = subscriptionsCancelledTodayQuery,
          response = QueryRecordsWrapperCaseClass(
            records = List[SFApiCompositePart[DigitalVoucherUpdate]](),
            nextRecordsUrl = None
          )
        )

    runApp(salesforceBackendStub, testClock) should ===(Right(ImovoCancellationResults()))
  }

  it should "return error if a salesforce update fails" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          auth = authResponse,
          query = subscriptionsCancelledTodayQuery,
          response = QueryRecordsWrapperCaseClass(
            List(
              voucherToCancelQueryResult("valid-sub"),
              voucherToCancelQueryResult("salesforce-failure")
            ),
            None
          )
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-valid-sub",
          lastActiveDate = None,
          response = ImovoSuccessResponse("OK", true)
        )
        .stubSubscriptionCancel(
          config = imovoConfig,
          subscriptionId = "sf-subscription-id-salesforce-failure",
          lastActiveDate = None,
          response = ImovoSuccessResponse("OK", true)
        )
        .stubComposite(
          auth = authResponse,
          expectedRequest = Some(SFApiCompositeRequest(
            true,
            false,
            List(
              salesforceVoucherUpdate("valid-sub"),
              salesforceVoucherUpdate("salesforce-failure")
            )
          )),
          response = SFApiCompositeResponse(
            List(
              SFApiCompositeResponsePart(200, "VoucherUpdated"),
              SFApiCompositeResponsePart(500, "VoucherUpdateFailed")
            )
          )
        )

    inside(runApp(salesforceBackendStub, testClock)) {
      case Left(DigitalVoucherCancellationProcessorAppError(message)) =>
        message should include("Failed to write changes to salesforce")

    }
  }

  private def runApp(salesforceBackendStub: SttpBackendStub[IO, Nothing], testClock: Clock) =
    DigitalVoucherCancellationProcessorApp(DevIdentity("digital-voucher-cancellation-processor"), salesforceBackendStub, testClock).value.unsafeRunSync()
}
