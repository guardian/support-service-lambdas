package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SQSLive, SecretsLive, SttpClientLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.refund.RefundSupporterPlus
import com.gu.productmove.zuora.TaxDetails
import com.gu.productmove.zuora.SubscriptionCancelSpec.{suite, test}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{Scope, ZLayer}
import zio.test.Assertion.{equalTo, isSome}
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assertTrue, assert}

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import scala.collection.immutable.{ListMap, SortedMap}
import scala.collection.mutable
import scala.collection.mutable.Stack

object GetRefundInvoiceDetailsLiveSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("GetInvoiceItemsForSubscriptionLive")(
      test("finds taxation details for a subscription") {

        for {
          result <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S00631534"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(
                new MockStackedGetInvoicesZuoraClient(
                  mutable.Stack(
                    MockGetInvoicesZuoraClient.responseWithTaxToMatchTaxItems,
                    MockGetInvoicesZuoraClient.taxationItemsResponse,
                  ),
                ),
              ),
              ZuoraGetLive.layer,
            )
        } yield {
          assertTrue(
            result.negativeInvoiceItems
              .find(_.TaxDetails.isDefined)
              .flatMap(_.TaxDetails)
              .contains(TaxDetails(-0.91, "8ad08dc989e27bbe0189e40e60f80ab8")),
          )
        }
      },
      test("checkInvoicesEqualBalance function works correctly") {

        for {
          result <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S00637582"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(
                new MockStackedGetInvoicesZuoraClient(
                  mutable.Stack(
                    MockGetInvoicesZuoraClient.responseWithTaxToMatchTaxItems,
                    MockGetInvoicesZuoraClient.taxationItemsResponse,
                  ),
                ),
              ),
              ZuoraGetLive.layer,
            )
          _ <- RefundSupporterPlus.checkInvoicesEqualBalance(10, result.negativeInvoiceItems)
        } yield {
          assertTrue(true)
        }
      },
    )

}
