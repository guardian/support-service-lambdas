package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetInvoice.GetInvoiceResponse
import zio.*

class MockGetInvoice(
    response: Map[String, GetInvoiceResponse],
) extends GetInvoice {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(invoiceId: String): Task[GetInvoiceResponse] = {
    mutableStore = invoiceId :: mutableStore

    response.get(invoiceId) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"mock: success = false: getinvoice " + invoiceId))
    }
  }
}

object MockGetInvoice {
  def requests: ZIO[MockGetInvoice, Nothing, List[String]] = ZIO.serviceWith[MockGetInvoice](_.requests)
}
