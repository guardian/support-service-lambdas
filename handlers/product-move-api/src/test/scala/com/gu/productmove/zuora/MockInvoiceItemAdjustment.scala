package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetAccount.PaymentMethodResponse
import com.gu.productmove.zuora.GetInvoiceItems.GetInvoiceItemsResponse
import com.gu.productmove.zuora.InvoiceItemAdjustment.InvoiceItemAdjustmentResponse
import com.gu.productmove.zuora.model.AccountNumber
import zio.{IO, ZIO}

class MockInvoiceItemAdjustment(
    response: Map[(String, BigDecimal, String, String), InvoiceItemAdjustmentResponse],
) extends InvoiceItemAdjustment {

  private var mutableStore: List[(String, BigDecimal, String, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
      adjustmentType: String,
      sourceType: String,
  ): IO[ErrorResponse, InvoiceItemAdjustmentResponse] = {
    mutableStore = (invoiceId, amount, invoiceItemId, adjustmentType) :: mutableStore

    response.get(invoiceId, amount, invoiceItemId, adjustmentType) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"success = false"))
  }
}

object MockInvoiceItemAdjustment {
  def requests: ZIO[MockInvoiceItemAdjustment, Nothing, List[(String, BigDecimal, String, String)]] =
    ZIO.serviceWith[MockInvoiceItemAdjustment](_.requests)
}
