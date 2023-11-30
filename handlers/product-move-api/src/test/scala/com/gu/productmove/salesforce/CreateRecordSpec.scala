package com.gu.productmove.salesforce

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.salesforce.{
  CreateRecordLive,
  GetSfSubscription,
  GetSfSubscriptionLive,
  MockCreateRecord,
  SalesforceClientLive,
  SalesforceHandler,
}
import com.gu.productmove.*
import com.gu.productmove.salesforce.CreateRecord.CreateRecordResponse
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import zio.test.*
import zio.test.Assertion.*
import zio.*

import java.time.*

object CreateRecordSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Create Salesforce Record")(
      test("Run locally") {
        /*
           Test suite used to run the salesforce lambda locally
         */

        for {
          _ <- Salesforce
            .createSfRecord(
              SalesforceRecordInput(
                subscriptionName = "A-S00102815",
                previousAmount = 10.0000000,
                newAmount = 10.0000000,
                previousProductName = "previous product name",
                previousRatePlanName = "previous rate plan",
                newRatePlanName = "new rate plan",
                requestedDate = LocalDate.now(),
                effectiveDate = LocalDate.now(),
                paidAmount = 12.000000,
                csrUserId = Some("0050J000005ZDPfQAO"),
                caseId = Some("5009E00000Mph1qQAB"),
              ),
            )
            .provide(
              SttpClientLive.layer,
              CreateRecordLive.layer,
              GetSfSubscriptionLive.layer,
              SalesforceClientLive.layer,
              SecretsLive.layer,
              AwsCredentialsLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
      test("Creates Salesforce record successfully") {
        val getSfSubscriptionStubs = Map("A-S00102815" -> sfSubscription1)
        val createRecordStubs = Map(createRecordRequest1 -> CreateRecordResponse("a0s9E00000ehvxUQAQ"))

        (for {
          output <- Salesforce.createSfRecord(
            SalesforceRecordInput(
              subscriptionName = "A-S00102815",
              previousAmount = BigDecimal(100),
              newAmount = BigDecimal(100),
              previousProductName = "previous product name",
              previousRatePlanName = "previous rate plan",
              newRatePlanName = "new rate plan",
              requestedDate = LocalDate.parse("2022-12-08"),
              effectiveDate = LocalDate.parse("2022-12-09"),
              paidAmount = BigDecimal(50),
              csrUserId = None,
              caseId = None,
            ),
          )

          getSubRequests <- MockGetSfSubscription.requests
          subUpdateRequests <- MockCreateRecord.requests
        } yield {
          assert(output)(equalTo(())) &&
          assert(getSubRequests)(equalTo(List("A-S00102815"))) &&
          assert(subUpdateRequests)(equalTo(List(createRecordRequest1)))
        }).provide(
          ZLayer.succeed(new MockGetSfSubscription(getSfSubscriptionStubs)),
          ZLayer.succeed(new MockCreateRecord(createRecordStubs)),
        )
      },
      test("Source is set correctly for CSR switches") {
        val getSfSubscriptionStubs = Map("A-S00102815" -> sfSubscription1)
        val createRecordStubs = Map(createRecordRequest2 -> CreateRecordResponse("a0s9E00000ehvxUQAQ"))

        (for {
          output <- Salesforce.createSfRecord(
            SalesforceRecordInput(
              subscriptionName = "A-S00102815",
              previousAmount = BigDecimal(100),
              newAmount = BigDecimal(100),
              previousProductName = "previous product name",
              previousRatePlanName = "previous rate plan",
              newRatePlanName = "new rate plan",
              requestedDate = LocalDate.parse("2022-12-08"),
              effectiveDate = LocalDate.parse("2022-12-09"),
              paidAmount = BigDecimal(50),
              csrUserId = Some("a_csr_id"),
              caseId = Some("a_case_id"),
            ),
          )

          getSubRequests <- MockGetSfSubscription.requests
          subUpdateRequests <- MockCreateRecord.requests
        } yield {
          assert(output)(equalTo(())) &&
          assert(getSubRequests)(equalTo(List("A-S00102815"))) &&
          assert(subUpdateRequests)(equalTo(List(createRecordRequest2)))
        }).provide(
          ZLayer.succeed(new MockGetSfSubscription(getSfSubscriptionStubs)),
          ZLayer.succeed(new MockCreateRecord(createRecordStubs)),
        )
      },
    )
}
