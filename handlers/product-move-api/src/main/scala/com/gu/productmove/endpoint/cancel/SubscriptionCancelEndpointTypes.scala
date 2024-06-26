package com.gu.productmove.endpoint.cancel

import com.gu.productmove.framework.InlineSchema.inlineSchema
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.*
import zio.json.*

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object SubscriptionCancelEndpointTypes {

  enum RefundType {
    case Asynchronous, Synchronous, NoRefund
  }

  case class ExpectedInput(
      @description("User cancellation reason - from a picklist.")
      @encodedExample(
        "mma_other",
      ) // also "mma_value_for_money" , "mma_support_another_way" , "mma_financial_circumstances", etc
      reason: String,
  ) derives JsonCodec

  given Schema[ExpectedInput] = inlineSchema(Schema.derived)

}
