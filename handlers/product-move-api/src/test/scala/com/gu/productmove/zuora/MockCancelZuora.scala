package com.gu.productmove.zuora

import zio.{IO, ZIO}

import java.time.LocalDate

class MockCancelZuora(responses: Map[(String, LocalDate), CancellationResponse]) extends ZuoraCancel {

  private var mutableStore: List[(String, LocalDate)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def cancel(
      subscriptionNumber: String,
      chargedThroughDate: LocalDate,
  ): ZIO[Any, String, CancellationResponse] = {
    mutableStore = (subscriptionNumber, chargedThroughDate) :: mutableStore

    responses.get((subscriptionNumber, chargedThroughDate)) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }
}

object MockCancelZuora {
  def requests: ZIO[MockCancelZuora, Nothing, List[(String, LocalDate)]] = ZIO.serviceWith[MockCancelZuora](_.requests)
}
