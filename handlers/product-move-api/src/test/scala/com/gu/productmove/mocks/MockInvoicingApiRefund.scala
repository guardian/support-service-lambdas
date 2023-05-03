package com.gu.productmove.mocks

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.zuora.MockGetAccount
import com.gu.productmove.zuora.model.SubscriptionName
import zio.ZIO

import scala.collection.mutable
import scala.collection.mutable.ArrayBuffer

class MockInvoicingApiRefund(val refundStubs: Map[(SubscriptionName, BigDecimal), RefundResponse])
    extends InvoicingApiRefund {
  val requests: ArrayBuffer[(SubscriptionName, BigDecimal)] = ArrayBuffer.empty

  def refund(subscriptionName: SubscriptionName, amount: BigDecimal): ZIO[Any, ErrorResponse, RefundResponse] = {
    requests += ((subscriptionName, amount))
    refundStubs.get(subscriptionName, amount) match {
      case Some(response) => ZIO.succeed(response)
      case None => ZIO.fail(InternalServerError(s"No response stubbed for input: (${subscriptionName.value}, $amount)"))
    }
  }
}

object MockInvoicingApiRefund {
  def requests: ZIO[MockInvoicingApiRefund, Nothing, List[(SubscriptionName, BigDecimal)]] =
    ZIO.serviceWith[MockInvoicingApiRefund](_.requests.toList)
}
