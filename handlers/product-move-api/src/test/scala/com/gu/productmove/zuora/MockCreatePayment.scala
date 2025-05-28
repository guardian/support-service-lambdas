package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetInvoice.GetInvoiceResponse
import com.gu.productmove.zuora.model.InvoiceId
import zio.*

import java.time.LocalDate

class MockCreatePayment(
    response: CreatePaymentResponse,
) extends CreatePayment {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def create(
      accountId: ZuoraAccountId,
      invoiceId: InvoiceId,
      paymentMethodId: String,
      amount: BigDecimal,
      today: LocalDate,
  ): Task[CreatePaymentResponse] = {
    mutableStore = invoiceId.id :: mutableStore
    ZIO.succeed(response)
  }
}

object MockCreatePayment {
  def requests: ZIO[MockCreatePayment, Nothing, List[String]] = ZIO.serviceWith[MockCreatePayment](_.requests)
}
