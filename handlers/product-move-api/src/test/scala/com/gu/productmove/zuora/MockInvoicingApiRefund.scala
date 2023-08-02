package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.model.SubscriptionName
import zio.ZIO

class MockInvoicingApiRefund extends InvoicingApiRefund {
  override def refund(
      subscriptionName: SubscriptionName,
      amount: BigDecimal,
  ): ZIO[Any, ProductMoveEndpointTypes.ErrorResponse, InvoicingApiRefund.RefundResponse] =
    ZIO.succeed(InvoicingApiRefund.RefundResponse("mocked_subscription_name", "mocked_invoice_id"))
}
