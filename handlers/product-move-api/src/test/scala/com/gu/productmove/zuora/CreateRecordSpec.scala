package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.refund.*
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.salesforce.{CreateRecordLive, GetSfSubscription, GetSfSubscriptionLive, SalesforceClientLive, SalesforceHandler}
import com.gu.productmove.salesforce.SalesforceHandler.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*

import java.time.*

object CreateRecordSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Create Salesforce Record")(test("Run locally") {
      /*
           Test suite used to run the refund lambda locally
         */

      for {
        _ <- SalesforceHandler.createSfRecord(SalesforceRecordInput("A-S00102815", 10.0000000,
          "prev rate plan", "new rate plan", LocalDate.now(), LocalDate.now(), 12.000000)).provide(
          AwsS3Live.layer,
          AwsCredentialsLive.layer,
          SttpClientLive.layer,
          ZLayer.succeed(Stage.valueOf("DEV")),
          CreateRecordLive.layer,
          GetSfSubscriptionLive.layer,
          SalesforceClientLive.layer
        )
      } yield assert(true)(equalTo(true))
    })
}
