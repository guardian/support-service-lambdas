package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.refund.RefundSupporterPlus
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGetLive
import zio.*
import zio.test.{Spec, TestEnvironment, ZIOSpecDefault, assertTrue}

import scala.collection.mutable

object GetRefundInvoiceDetailsLiveSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
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
      test("finds discount details for a subscription") {
        for {
          result <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S00631534"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(
                new MockStackedGetInvoicesZuoraClient(
                  mutable.Stack(
                    MockGetInvoicesZuoraClient.responseWithDiscount,
                    MockGetInvoicesZuoraClient.taxationItemsForDiscount,
                  ),
                ),
              ),
              ZuoraGetLive.layer,
            )
        } yield {
          assertTrue(
            result.negativeInvoiceItems.size == 3,
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
