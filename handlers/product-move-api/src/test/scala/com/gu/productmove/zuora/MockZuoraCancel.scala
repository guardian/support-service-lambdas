package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.SubscriptionName
import zio.{IO, ZIO}

import java.time.LocalDate

class MockZuoraCancel(responses: Map[(SubscriptionName, LocalDate), CancellationResponse]) extends ZuoraCancel {

  private var mutableStore: List[(SubscriptionName, LocalDate)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def cancel(
      subscriptionName: SubscriptionName,
      chargedThroughDate: LocalDate,
  ): ZIO[Any, String, CancellationResponse] = {
    mutableStore = (subscriptionName, chargedThroughDate) :: mutableStore

    responses.get((subscriptionName, chargedThroughDate)) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None =>
        ZIO.fail(
          s"MockZuoraCancel: no response stubbed for parameters: (${subscriptionName.value}, $chargedThroughDate)",
        )
  }
}

object MockZuoraCancel {
  def requests: ZIO[MockZuoraCancel, Nothing, List[(SubscriptionName, LocalDate)]] =
    ZIO.serviceWith[MockZuoraCancel](_.requests)
}
