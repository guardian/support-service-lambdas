package com.gu.productmove.refund

import com.gu.productmove.zuora.model.SubscriptionName
import zio.ZIO
import zio.json.*
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

case class InvoicingApiRefundInput(
    subscriptionName: SubscriptionName,
    amount: BigDecimal,
)

object InvoicingApiRefundInput {

  given JsonDecoder[InvoicingApiRefundInput] = DeriveJsonDecoder.gen[InvoicingApiRefundInput]

  given JsonEncoder[InvoicingApiRefundInput] = DeriveJsonEncoder.gen[InvoicingApiRefundInput]

}
