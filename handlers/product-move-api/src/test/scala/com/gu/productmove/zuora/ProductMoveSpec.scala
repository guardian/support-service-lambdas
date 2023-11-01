package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.move.{ProductMoveEndpoint, RecurringContributionToSupporterPlus}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.SecretsLive
import com.gu.productmove._
import zio._
import zio.test.Assertion._
import zio.test._

import java.time._

object ProductMoveSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Switch")(
      test("Run product switch lambda locally") {
        for {
          _ <- TestClock.setTime(Instant.now())
          _ <- RecurringContributionToSupporterPlus(
            SubscriptionName("A-S00660620"),
            ExpectedInput(
              price = 120,
              preview = false,
              checkChargeAmountBeforeUpdate = true,
              csrUserId = None,
              caseId = None,
            ),
          )
            .provide(
              GetSubscriptionLive.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              SubscriptionUpdateLive.layer,
              TermRenewalLive.layer,
              SQSLive.layer,
              GetAccountLive.layer,
              GuStageLive.layer,
              DynamoLive.layer,
              GetInvoiceItemsLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
            )
        } yield {
          assert(true)(equalTo(true))
        }
      } @@ TestAspect.ignore,
      test("Run product switch preview locally") {
        for {
          _ <- TestClock.setTime(Instant.now())
          output <- RecurringContributionToSupporterPlus(
            SubscriptionName("A-S00217859"),
            ExpectedInput(50, true, false, None, None),
          )
            .provide(
              GetSubscriptionLive.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              SubscriptionUpdateLive.layer,
              TermRenewalLive.layer,
              SQSLive.layer,
              GetAccountLive.layer,
              GuStageLive.layer,
              DynamoLive.layer,
              GetInvoiceItemsLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
            )
        } yield {
          println(output)
          assert(true)(equalTo(true))
        }
      } @@ TestAspect.ignore,
    )

}
