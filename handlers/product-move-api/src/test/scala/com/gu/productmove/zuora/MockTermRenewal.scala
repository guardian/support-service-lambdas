package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.{GetSubscription, SubscriptionUpdatePreviewResponse}
import com.gu.productmove.zuora.model.SubscriptionName
import zio.json.JsonDecoder
import zio.{IO, ZIO}

import java.time.LocalDate

class MockTermRenewal(
    update: Map[SubscriptionName, RenewalResponse],
) extends TermRenewal {

  private var mutableStore: List[(SubscriptionName)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def renewSubscription(
      subscriptionName: SubscriptionName,
      collectPayment: Boolean,
  ): ZIO[Any, ErrorResponse, RenewalResponse] = {
    mutableStore = subscriptionName :: mutableStore

    ZIO.succeed(
      RenewalResponse(
        success = Some(true),
        invoiceId = Some("invoiceId"),
      ),
    )
  }
}

object MockTermRenewal {
  def requests: ZIO[MockTermRenewal, Nothing, List[SubscriptionName]] =
    ZIO.serviceWith[MockTermRenewal](_.requests)
}
