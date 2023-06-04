package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetAccount.PaymentMethodResponse
import com.gu.productmove.zuora.GetInvoiceItems.GetInvoiceItemsResponse
import com.gu.productmove.zuora.model.AccountNumber
import zio.{IO, ZIO}

class MockGetInvoiceItems(
    response: Map[String, GetInvoiceItemsResponse],
) extends GetInvoiceItems {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(invoiceId: String): IO[ErrorResponse, GetInvoiceItemsResponse] = {
    mutableStore = invoiceId :: mutableStore

    response.get(invoiceId) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"success = false"))
  }
}

object MockGetAccount {
  def requests: ZIO[MockGetInvoiceItems, Nothing, List[String]] = ZIO.serviceWith[MockGetInvoiceItems](_.requests)
}
