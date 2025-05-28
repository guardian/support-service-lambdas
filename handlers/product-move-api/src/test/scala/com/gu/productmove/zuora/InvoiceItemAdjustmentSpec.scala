package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.InvoiceItemAdjustment.InvoiceItemAdjustmentResult
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.*
import zio.*
import zio.json.JsonDecoder
import zio.test.*
import zio.test.Assertion.*

import java.time.*

object InvoiceItemAdjustmentSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("InvoiceItemAdjustment")(
      test("buildInvoiceAdjustments function ignores invoice items with zero value") {
        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          List(
            InvoiceItemWithTaxDetails(
              Id = "8ad08dc989d472290189db0888460962",
              ChargeDate = "2023-08-09T17:01:56.000+01:00",
              ChargeAmount = -120,
              TaxDetails = None,
              InvoiceId = InvoiceId("8ad08dc989d472290189db08883a0961"),
            ),
            InvoiceItemWithTaxDetails(
              Id = "8ad08dc989d472290189db0888460963",
              ChargeDate = "2023-08-09T17:01:56.000+01:00",
              ChargeAmount = 0,
              TaxDetails = None,
              InvoiceId = InvoiceId("8ad08dc989d472290189db08883a0961"),
            ),
          ),
        )
        assert(adjustments.length)(equalTo(1)) &&
        assert(adjustments.head.Amount)(equalTo(120))
      },
      test("buildInvoiceAdjustments function uses the correct adjustment date") {
        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          List(
            InvoiceItemWithTaxDetails(
              Id = "8a12843289e577d00189f660966d56bd",
              ChargeDate = "2023-08-15T00:27:52.000+01:00",
              ChargeAmount = -33,
              TaxDetails = None,
              InvoiceId = InvoiceId("8a12843289e577d00189f660965f56bc"),
            ),
            InvoiceItemWithTaxDetails(
              Id = "8a12843289e577d00189f660966d56be",
              ChargeDate = "2023-08-15T00:27:52.000+01:00",
              ChargeAmount = -15.45,
              TaxDetails = None,
              InvoiceId = InvoiceId("8a12843289e577d00189f660965f56bc"),
            ),
          ),
        )
        assert(adjustments.length)(equalTo(2)) &&
        assert(adjustments.head.AdjustmentDate.getDayOfMonth)(equalTo(15))
      },
      test("buildInvoiceAdjustments function handles discounts correctly for sub with tax and no contribution") {
        val invoiceItems = List(
          // Contribution charge
          InvoiceItemWithTaxDetails(
            Id = "8a12867e90766628019084f204fa5334",
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            ChargeAmount = 0,
            TaxDetails = None,
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
          ),
          // Subscription charge
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            TaxDetails = Some(TaxDetails(-0.91, "8a12867e90766628019084f204fa5338")),
            Id = "8a12867e90766628019084f204fa5335",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = -9.09,
          ),
          // The discount
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            AppliedToInvoiceItemId = Some("8a12867e90766628019084f204fa5335"),
            TaxDetails = Some(TaxDetails(0.45, "8a12867e90766628019084f204fa5339")),
            Id = "8a12867e90766628019084f204fa5336",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = 4.55,
          ),
        )

        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          invoiceItems,
        )
        val adjustmentAmount = adjustments.map(item => item.Amount).sum
        assert(adjustments.length)(equalTo(2)) &&
        assert(adjustmentAmount)(equalTo(5))
      },
      test("buildInvoiceAdjustments function handles discounts correctly for sub with tax and contribution") {
        val invoiceItems = List(
          // Contribution charge
          InvoiceItemWithTaxDetails(
            Id = "8a12867e90766628019084f204fa5334",
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            ChargeAmount = -10,
            TaxDetails = None,
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
          ),
          // Subscription charge
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            TaxDetails = Some(TaxDetails(-0.91, "8a12867e90766628019084f204fa5338")),
            Id = "8a12867e90766628019084f204fa5335",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = -9.09,
          ),
          // The discount
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            AppliedToInvoiceItemId = Some("8a12867e90766628019084f204fa5335"),
            TaxDetails = Some(TaxDetails(0.45, "8a12867e90766628019084f204fa5339")),
            Id = "8a12867e90766628019084f204fa5336",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = 4.55,
          ),
        )

        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          invoiceItems,
        )
        val adjustmentAmount = adjustments.map(item => item.Amount).sum
        assert(adjustments.length)(equalTo(3)) &&
        assert(adjustmentAmount)(equalTo(15))
      },
      test("buildInvoiceAdjustments function handles discounts correctly for sub with no tax and contribution") {
        val invoiceItems = List(
          // Contribution charge
          InvoiceItemWithTaxDetails(
            Id = "8a12867e90766628019084f204fa5334",
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            ChargeAmount = -10,
            TaxDetails = None,
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
          ),
          // Subscription charge
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            TaxDetails = None,
            Id = "8a12867e90766628019084f204fa5335",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = -15,
          ),
          // The discount
          InvoiceItemWithTaxDetails(
            ChargeDate = "2024-07-05T23:09:31.000+01:00",
            AppliedToInvoiceItemId = Some("8a12867e90766628019084f204fa5335"),
            TaxDetails = None,
            Id = "8a12867e90766628019084f204fa5336",
            InvoiceId = InvoiceId("8a12867e90766628019084f204f15333"),
            ChargeAmount = 5,
          ),
        )

        val adjustments = RefundSupporterPlus.buildInvoiceItemAdjustments(
          invoiceItems,
        )
        val adjustmentAmount = adjustments.map(item => item.Amount).sum
        assert(adjustments.length)(equalTo(2)) &&
        assert(adjustments.find(_.SourceId == "8a12867e90766628019084f204fa5335").get.Amount)(equalTo(10)) &&
        assert(adjustmentAmount)(equalTo(20))
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
