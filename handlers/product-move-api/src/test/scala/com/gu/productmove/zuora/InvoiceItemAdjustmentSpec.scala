package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.*
import com.gu.productmove.zuora.InvoiceItemWithTaxDetails
import com.gu.productmove.zuora.InvoiceItemAdjustment.InvoiceItemAdjustmentResult
import zio.test.*
import zio.test.Assertion.*
import zio.*
import zio.json.JsonDecoder

import java.time.*

object InvoiceItemAdjustmentSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("InvoiceItemAdjustment")(
      test("Run InvoiceItemAdjustment locally") {
        for {
          _ <- TestClock.setTime(LocalDateTime.now.toInstant(ZoneOffset.UTC))
          _ <- InvoiceItemAdjustment
            .update(
              invoiceId = "8ad09b2186bfd8100186c73164d82886",
              amount = 11.43,
              invoiceItemId = "8ad09b2186bfd8100186c73164e92887",
              "Charge",
            )
            .provide(
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
      test("buildInvoiceAdjustments function ignores invoice items with zero value") {
        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          LocalDate.now,
          List(
            InvoiceItemWithTaxDetails(
              "8ad08dc989d472290189db0888460962",
              "2023-08-09T17:01:56.000+01:00",
              -120,
              None,
              "8ad08dc989d472290189db08883a0961",
            ),
            InvoiceItemWithTaxDetails(
              "8ad08dc989d472290189db0888460963",
              "2023-08-09T17:01:56.000+01:00",
              0,
              None,
              "8ad08dc989d472290189db08883a0961",
            ),
          ),
        )
        assert(adjustments.length)(equalTo(1)) &&
        assert(adjustments.head.Amount)(equalTo(1119))
      },
      test("Deserialisation of the invoice adjustment response works") {
        val responseJson =
          """
            |[{"Id":"8ad081c689de67b50189df0bdcca3b2f","Success":true}]
            |""".stripMargin

        val result = summon[JsonDecoder[List[InvoiceItemAdjustmentResult]]].decodeJson(responseJson)
        assert(result.isRight)(equalTo(true))
      },
    )
}
