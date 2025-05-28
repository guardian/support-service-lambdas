package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetInvoice.GetInvoiceResponse
import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.client3.*
import zio.json.*
import zio.{RIO, Task, URLayer, ZIO, ZLayer}

object GetInvoiceLive {
  val layer: URLayer[ZuoraGet, GetInvoice] = ZLayer.fromFunction(GetInvoiceLive(_))
}

private class GetInvoiceLive(zuoraGet: ZuoraGet) extends GetInvoice {
  override def get(invoiceId: InvoiceId): Task[GetInvoiceResponse] =
    zuoraGet.get[GetInvoiceResponse](
      uri"invoices/${invoiceId.id}",
      ZuoraRestBody.ZuoraSuccessCheck.None,
    )
}

trait GetInvoice {
  def get(invoiceId: InvoiceId): Task[GetInvoiceResponse]
}

object GetInvoice {

  case class GetInvoiceResponse(balance: BigDecimal)

  given JsonDecoder[GetInvoiceResponse] = DeriveJsonDecoder.gen[GetInvoiceResponse]

  def get(invoiceId: InvoiceId): RIO[GetInvoice, GetInvoiceResponse] =
    ZIO.serviceWithZIO[GetInvoice](_.get(invoiceId))
}
