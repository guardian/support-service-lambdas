package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  GuStageLive,
  SttpClientLive,
  getSubscriptionResponse,
  ratePlanCharge1,
}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.*
import zio.*
import zio.test.Assertion.*
import zio.test.*
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import Fixtures.*
import com.gu.i18n.Currency.GBP
import com.gu.productmove.GuStageLive.Stage.CODE
import com.gu.productmove.move.BuildPreviewResult
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.newproduct.api.productcatalog.Monthly
import com.gu.productmove.endpoint.move.switchtype.{
  GetRatePlans,
  ProductSwitchRatePlanIds,
  RecurringContributionRatePlanIds,
  RecurringContributionToSupporterPlus,
  RecurringContributionToSupporterPlusImpl,
  SupporterPlusRatePlanIds,
}

import java.time.*
import scala.None

object SubscriptionUpdateSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("subscription update service")(
      test("SwitchProductUpdateRequest is correct for input (CODE)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SwitchProductUpdateRequest(
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

        val recurringContributionToSupporterPlus = new GetRatePlans(
          CODE,
          MockCatalogue(),
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- recurringContributionToSupporterPlus
            .getRatePlans(Monthly, GBP, "8ad03sdfa1312f3123", 50.00)
            .map { case (addRatePlan, removeRatePlan) =>
              SwitchProductUpdateRequest(
                add = addRatePlan,
                remove = removeRatePlan,
                collect = Some(true),
                runBilling = Some(true),
                preview = Some(false),
              )
            }
        } yield assert(createRequestBody)(equalTo(expectedRequestBody))
      } @@ TestAspect.ignore,
      test("SwitchProductUpdateRequest is correct for input (PROD)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SwitchProductUpdateRequest(
          add = List(
            AddRatePlan(
              contractEffectiveDate = timeLocalDate,
              productRatePlanId = "8a128ed885fc6ded018602296ace3eb8",
              chargeOverrides = List(
                ChargeOverrides(
                  price = Some(40.00),
                  productRatePlanChargeId = "8a128d7085fc6dec01860234cd075270",
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

        val recurringContributionToSupporterPlus = new GetRatePlans(
          CODE,
          MockCatalogue(),
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- recurringContributionToSupporterPlus
            .getRatePlans(Monthly, GBP, "8ad03sdfa1312f3123", 50.00)
            .map { case (addRatePlan, removeRatePlan) =>
              SwitchProductUpdateRequest(
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
//      test("SwitchProductUpdateRequest preview response is correct for invoice with multiple invoice items") {
//        val time = LocalDateTime.parse("2023-01-19T00:00:00").toInstant(ZoneOffset.ofHours(0))
//
//        val expectedResponse = PreviewResult(
//          amountPayableToday = 0,
//          false,
//          contributionRefundAmount = -16,
//          supporterPlusPurchaseAmount = 16,
//          LocalDate.of(2023, 2, 19),
//        )
//
//        for {
//          _ <- TestClock.setTime(time)
//          response <- BuildPreviewResult
//            .getPreviewResult(
//              SubscriptionName("A-S12345678"),
//              ratePlanCharge1,
//              invoiceWithMultipleInvoiceItems,
//              ProductSwitchRatePlanIds(
//                SupporterPlusRatePlanIds(
//                  supporterPlusProductRatePlanId,
//                  supporterPlusSubscriptionRatePlanChargeId,
//                  supporterPlusContributionRatePlanChargeId,
//                ),
//                RecurringContributionRatePlanIds(
//                  recurringContributionRatePlanChargeId,
//                ),
//              ),
//            )
//            .provideLayer(
//              ZLayer.succeed(Stage.valueOf("CODE")),
//            )
//        } yield {
//          assert(response)(equalTo(expectedResponse))
//        }
//      },
      test("SwitchProductUpdateRequest preview response is correct for invoice with tax") {
        val time = LocalDateTime.parse("2023-02-06T00:00:00").toInstant(ZoneOffset.ofHours(0))

        val expectedResponse = PreviewResult(
          amountPayableToday = 7,
          false,
          contributionRefundAmount = -8,
          supporterPlusPurchaseAmount = 15,
          LocalDate.of(2023, 3, 6),
        )

        for {
          _ <- TestClock.setTime(time)
          response <- BuildPreviewResult
            .getPreviewResult(
              SubscriptionName("A-S12345678"),
              ratePlanCharge1,
              invoiceWithTax,
              ProductSwitchRatePlanIds(
                SupporterPlusRatePlanIds(
                  supporterPlusProductRatePlanId,
                  supporterPlusSubscriptionRatePlanChargeId,
                  supporterPlusContributionRatePlanChargeId,
                ),
                RecurringContributionRatePlanIds(
                  recurringContributionRatePlanChargeId,
                ),
              ),
            )
            .provideLayer(
              ZLayer.succeed(Stage.valueOf("CODE")),
            )
        } yield assert(response)(equalTo(expectedResponse))
      },
    )

}
