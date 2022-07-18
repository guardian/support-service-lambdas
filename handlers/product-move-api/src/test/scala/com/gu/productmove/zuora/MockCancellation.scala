package com.gu.productmove.zuora

import zio.{IO, ZIO}

import java.time.LocalDate

class MockCancellation(responses: Map[(String, LocalDate), CancellationResponse]) extends Cancellation {

  private var mutableStore: List[(String, LocalDate)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def cancel(subscriptionNumber: String, chargedThroughDate: LocalDate): ZIO[Any, String, CancellationResponse] = {
    mutableStore = (subscriptionNumber, chargedThroughDate) :: mutableStore

    responses.get((subscriptionNumber, chargedThroughDate)) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }
}

object MockCancellation {
  def requests: ZIO[MockCancellation, Nothing, List[(String, LocalDate)]] = ZIO.serviceWith[MockCancellation](_.requests)
}
