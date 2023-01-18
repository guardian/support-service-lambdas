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
                "A-S00102815",
                10.0000000,
                "old product name",
                "old rate plan",
                "new rate plan",
                LocalDate.now(),
                LocalDate.now(),
                12.000000,
              ),
            )
            .provide(
              AwsS3Live.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZLayer.succeed(Stage.valueOf("DEV")),
              CreateRecordLive.layer,
              GetSfSubscriptionLive.layer,
              SalesforceClientLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
      test("Creates Salesforce record successfully") {
        val getSfSubscriptionStubs = Map("A-S00102815" -> sfSubscription1)
        val createRecordStubs = Map(createRecordRequest1 -> CreateRecordResponse("a0s9E00000ehvxUQAQ"))

        (for {
          output <- Salesforce.createSfRecord(
            SalesforceRecordInput(
              "A-S00102815",
              BigDecimal(100),
              "old product name",
              "old rate plan",
              "new rate plan",
              LocalDate.parse("2022-12-08"),
              LocalDate.parse("2022-12-09"),
              BigDecimal(50),
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
    )
}
