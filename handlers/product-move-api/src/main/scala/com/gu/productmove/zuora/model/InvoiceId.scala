package com.gu.productmove.zuora.model

import zio.json.{JsonCodec, JsonDecoder}

case class InvoiceId(id: String)

object InvoiceId {
  given JsonCodec[InvoiceId] = JsonCodec.string.transform(InvoiceId.apply, _.id)
}
