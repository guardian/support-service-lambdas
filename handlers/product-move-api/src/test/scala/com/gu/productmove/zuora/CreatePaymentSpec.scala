package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.move.{ProductMoveEndpoint, RecurringContributionToSupporterPlus}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.*

object CreatePaymentSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Create Payment")(
      test("Test creating a payment locally") {
        for {
          _ <- CreatePayment
            .create(
              accountId = "8ad09be48bae944c018baf50186850a5",
              invoiceId = "8ad087d28bb86b72018bb9e90bad101d",
              paymentMethodId = "8ad09be48bae944c018baf50189950aa",
              amount = 45.270000000,
              today = LocalDate.now(),
            )
            .provide(
              ZuoraGetLive.layer,
              ZuoraClientLive.layer,
              CreatePaymentLive.layer,
              SttpClientLive.layer,
              SecretsLive.layer,
              AwsCredentialsLive.layer,
            )

        } yield {
          assert(true)(equalTo(true))
        }
      } @@ TestAspect.ignore,
    )
}
