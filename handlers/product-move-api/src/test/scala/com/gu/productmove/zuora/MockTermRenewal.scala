package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.{GetSubscription, SubscriptionUpdatePreviewResponse}
import com.gu.productmove.zuora.model.SubscriptionId
import zio.json.JsonDecoder
import zio.{IO, ZIO}

import java.time.LocalDate

class MockTermRenewal(
    update: Map[(SubscriptionId, LocalDate), AmendmentResponse],
) extends TermRenewal {

  private var mutableStore: List[(SubscriptionId, LocalDate)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update[R: JsonDecoder](
      subscriptionId: SubscriptionId,
      termStartDate: LocalDate,
  ): ZIO[Any, ErrorResponse, R] = {
    mutableStore = (subscriptionId, termStartDate) :: mutableStore

    ZIO.succeed(AmendmentResponse(List(AmendmentResult(Nil, true))).asInstanceOf[R])
  }
}

object MockTermRenewal {
  def requests: ZIO[MockTermRenewal, Nothing, List[(SubscriptionId, LocalDate)]] =
    ZIO.serviceWith[MockTermRenewal](_.requests)
}
