package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, Instant, LocalDate, ZoneId}

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.digital_voucher_cancellation_processor.DigitalVoucherCancellationProcessorService.{DigitalVoucherQueryResult, DigitalVoucherUpdate, ImovoCancellationResults, SubscriptionQueryResult}
import com.gu.imovo.{ImovoConfig, ImovoSuccessResponse}
import com.gu.salesforce.sttp.{QueryRecordsWrapperCaseClass, SFApiCompositePart, SFApiCompositeRequest, SFApiCompositeResponse, SFApiCompositeResponsePart}
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.imovo.ImovoStub._
import com.gu.salesforce.sttp.SalesforceStub._
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import com.gu.salesforce.sttp.SalesforceStub._
import io.circe.generic.auto._
import org.scalatest.Inside.inside

class DigitalVoucherCancellationProcessorServiceTest extends AnyFlatSpec with Matchers {
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

  "DigitalVoucherCancellationProcessor" should "query salesforce for subscriptions to cancel" in {
    val voucherToCancelQueryResult = DigitalVoucherQueryResult(
      "digital-voucher-id",
      "/services/data/v29.0/sobjects/Digital_Voucher__c/digital-voucher-id",
      SubscriptionQueryResult(
        "sf-subscription-id",
        "/services/data/v29.0/sobjects/SF_Subscription__c/sf-subscription-id"
      )
    )
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          authResponse,
          DigitalVoucherCancellationProcessorService.subscrptionsCancelledTodayQuery(LocalDate.parse("2020-03-18")),
          QueryRecordsWrapperCaseClass(
            List(voucherToCancelQueryResult),
            None
          )
        )
        .stubComposite(
          authResponse,
          Some(
            SFApiCompositeRequest(
              true,
              true,
              List(
                SFApiCompositePart(
                  "digital-voucher-id",
                  "PATCH",
                  "/services/data/v29.0/sobjects/Digital_Voucher__c/digital-voucher-id",
                  DigitalVoucherUpdate(now)
                )
              )
            )
          ),
          SFApiCompositeResponse(
            List(
              SFApiCompositeResponsePart(200, "VoucherUpdated")
            )
          )
        )
        .stubSubscriptionCancel(imovoConfig, "sf-subscription-id", None, ImovoSuccessResponse("OK", true))
    val results: DigitalVoucherCancellationProcessorService.ImovoCancellationResults = runApp(salesforceBackendStub, testClock)
    results should ===(ImovoCancellationResults(successfullyCancelled = List(voucherToCancelQueryResult)))
  }

  private def runApp(salesforceBackendStub: SttpBackendStub[IO, Nothing], testClock: Clock) = {
    inside(DigitalVoucherCancellationProcessorApp(DevIdentity("digital-voucher-cancellation-processor"), salesforceBackendStub, testClock).value.unsafeRunSync()) {
      case Right(value) => value
    }
  }
}
