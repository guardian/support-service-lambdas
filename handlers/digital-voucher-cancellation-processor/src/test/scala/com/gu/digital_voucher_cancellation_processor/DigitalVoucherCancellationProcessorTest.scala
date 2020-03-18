package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, Instant, LocalDate, ZoneId}

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.digital_voucher_cancellation_processor.DigitalVoucherCancellationProcessor.{DigitalVoucherQueryRecord, SubscriptionQueryRecord}
import com.gu.salesforce.sttp.QueryRecordsWrapperCaseClass
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import com.gu.salesforce.sttp.SalesforceStub._
import io.circe.generic.auto._
import org.scalatest.Inside.inside

class DigitalVoucherCancellationProcessorTest extends AnyFlatSpec with Matchers {
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

  val testClock = Clock.fixed(Instant.parse("2020-03-18T00:00:30.00Z"), ZoneId.systemDefault())

  "DigitalVoucherCancellationProcessor" should "query salesforce for subscriptions to cancel" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(authConfig, authResponse)
        .stubQuery(
          authResponse,
          DigitalVoucherCancellationProcessor.subscrptionsCancelledTodayQuery(LocalDate.parse("2020-03-18")),
          QueryRecordsWrapperCaseClass(
            List(
              DigitalVoucherQueryRecord(
                "digital-voucher-id",
                SubscriptionQueryRecord("sf-subscription-id")
              )
            ),
            None
          )
        )
      runApp(salesforceBackendStub, testClock)
  }

  private def runApp(salesforceBackendStub: SttpBackendStub[IO, Nothing], testClock: Clock) = {
    inside(DigitalVoucherCancellationProcessorApp(DevIdentity("digital-voucher-cancellation-processor"), salesforceBackendStub, testClock).value.unsafeRunSync()) {
      case Right(value) => value
    }
  }
}
