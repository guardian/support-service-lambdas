package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import zio.*

import java.time.LocalDate

class MockZuoraCancel(responses: Set[(SubscriptionName, LocalDate)]) extends ZuoraCancel {

  private var mutableStore: List[(AccountNumber, SubscriptionName, LocalDate, LocalDate)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def cancel(
      accountNumber: AccountNumber,
      subscriptionName: SubscriptionName,
      chargedThroughDate: LocalDate,
      orderDate: LocalDate,
  ): Task[Unit] = {
    mutableStore = (accountNumber, subscriptionName, chargedThroughDate, orderDate) :: mutableStore

    responses.contains((subscriptionName, chargedThroughDate)) match {
      case true => ZIO.unit
      case false =>
        ZIO.fail(
          new Throwable(
            s"MockZuoraCancel: no response stubbed for parameters: (${subscriptionName.value}, $chargedThroughDate)",
          ),
        )
    }
  }
}

object MockZuoraCancel {
  def requests: ZIO[MockZuoraCancel, Nothing, List[(AccountNumber, SubscriptionName, LocalDate, LocalDate)]] =
    ZIO.serviceWith[MockZuoraCancel](_.requests)
}
