package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.Monthly
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.{
  GuStageLive,
  AwsCredentialsLive,
  SttpClientLive,
  ratePlanCharge1,
  getSubscriptionResponse,
  AwsS3Live,
}
import com.gu.productmove.endpoint.available.{TimePeriod, Trial, MoveToProduct, Offer, Billing, Currency, TimeUnit}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{ZuoraGetLive, ZuoraClientLive}
import zio.{ZIO, IO}
import zio.*
import zio.test.Assertion.*
import zio.test.*
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import Fixtures.*
import com.gu.newproduct.api.productcatalog.PlanId.MonthlySupporterPlus
import com.gu.i18n.Currency.GBP
import com.gu.productmove.endpoint.move.RecurringContributionToSupporterPlus.getRatePlans
import com.gu.productmove.endpoint.move.SupporterPlusRatePlanIds
import com.gu.productmove.move.BuildPreviewResult
import com.gu.productmove.zuora.model.SubscriptionName

import java.time.*
import scala.None

object SubscriptionUpdateSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("subscription update service")(
      test("SubscriptionUpdateRequest is correct for input (CODE)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SubscriptionUpdateRequest(
          add = List(
            AddRatePlan(
              contractEffectiveDate = timeLocalDate,
              productRatePlanId = "8ad08cbd8586721c01858804e3275376",
              chargeOverrides = List(
                ChargeOverrides(
                  price = Some(40.00),
                  productRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c",
                ),
              ),
            ),
          ),
          remove = List(
            RemoveRatePlan(
              contractEffectiveDate = timeLocalDate,
              ratePlanId = "8ad03sdfa1312f3123",
            ),
          ),
          collect = Some(true),
          runBilling = Some(true),
          preview = Some(false),
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- getRatePlans(Monthly, GBP, "8ad03sdfa1312f3123", 50.00)
            .map { case (addRatePlan, removeRatePlan) =>
              SubscriptionUpdateRequest(
                add = addRatePlan,
                remove = removeRatePlan,
                collect = Some(true),
                runBilling = Some(true),
                preview = Some(false),
              )
            }
            .provideLayer(
              ZLayer.succeed(Stage.valueOf("CODE")),
            )
        } yield assert(createRequestBody)(equalTo(expectedRequestBody))
      } @@ TestAspect.ignore, // TODO: make the code which fetches the catalog price a dependency so it can be mocked
      test("SubscriptionUpdateRequest is correct for input (PROD)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SubscriptionUpdateRequest(
          add = List(
            AddRatePlan(
              contractEffectiveDate = timeLocalDate,
              productRatePlanId = "8a12865b8219d9b401822106192b64dc",
              chargeOverrides = List(
                ChargeOverrides(
                  price = Some(50.00),
                  productRatePlanChargeId = "8a12865b8219d9b401822106194e64e3",
                ),
              ),
            ),
          ),
          remove = List(
            RemoveRatePlan(
              contractEffectiveDate = timeLocalDate,
              ratePlanId = "8ad03sdfa1312f3123",
            ),
          ),
          collect = Some(true),
          runBilling = Some(true),
          preview = Some(false),
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- getRatePlans(Monthly, GBP, "8ad03sdfa1312f3123", 50.00)
            .map { case (addRatePlan, removeRatePlan) =>
              SubscriptionUpdateRequest(
                add = addRatePlan,
                remove = removeRatePlan,
                collect = Some(true),
                runBilling = Some(true),
                preview = Some(false),
              )
            }
            .provideLayer(
              ZLayer.succeed(Stage.valueOf("PROD")),
            )
        } yield assert(createRequestBody)(equalTo(expectedRequestBody))
      } @@ TestAspect.ignore, // TODO: make the code which fetches the catalog price a dependency so it can be mocked
      test("SubscriptionUpdateRequest preview response is correct for invoice with multiple invoice items") {
        val time = LocalDateTime.parse("2023-01-19T00:00:00").toInstant(ZoneOffset.ofHours(0))

        val expectedResponse = PreviewResult(
          amountPayableToday = -6,
          false,
          contributionRefundAmount = -16,
          supporterPlusPurchaseAmount = 10,
          LocalDate.of(2023, 2, 19),
        )

        for {
          _ <- TestClock.setTime(time)
          response <- BuildPreviewResult
            .getPreviewResult(
              SubscriptionName("A-S12345678"),
              ratePlanCharge1,
              invoiceWithMultipleInvoiceItems,
              SupporterPlusRatePlanIds(
                "8ad08cbd8586721c01858804e3275376",
                "8ad08cbd8586721c01858804e3715378",
                Some("8ad09ea0858682bb0185880ac57f4c4c"),
              ),
            )
            .provideLayer(
              ZLayer.succeed(Stage.valueOf("CODE")),
            )
        } yield {
          val blah = response
          assert(response)(equalTo(expectedResponse))
        }
      },
      test("SubscriptionUpdateRequest preview response is correct for invoice with tax") {
        val time = LocalDateTime.parse("2023-02-06T00:00:00").toInstant(ZoneOffset.ofHours(0))

        val expectedResponse = PreviewResult(
          amountPayableToday = -10,
          false,
          contributionRefundAmount = -20,
          supporterPlusPurchaseAmount = 10,
          LocalDate.of(2023, 3, 6),
        )

        for {
          _ <- TestClock.setTime(time)
          response <- BuildPreviewResult
            .getPreviewResult(
              SubscriptionName("A-S12345678"),
              ratePlanCharge1,
              invoiceWithTax,
              SupporterPlusRatePlanIds(
                "8ad08cbd8586721c01858804e3275376",
                "8ad08cbd8586721c01858804e3715378",
                Some("8ad09ea0858682bb0185880ac57f4c4c"),
              ),
            )
            .provideLayer(
              ZLayer.succeed(Stage.valueOf("CODE")),
            )
        } yield assert(response)(equalTo(expectedResponse))
      },
    )

}
