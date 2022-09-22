package com.gu.productmove.endpoint.cancel

import com.gu.productmove.framework.InlineSchema.inlineSchema
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.*
import zio.json.*

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object SubscriptionCancelEndpointTypes {

  case class ExpectedInput(
    @description("User cancellation reason - from a picklist.")
    @encodedExample("mma_other")// also "mma_value_for_money" , "mma_support_another_way" , "mma_financial_circumstances", etc
    reason: String // TODO consider an enumeration
  )

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]
  given JsonEncoder[ExpectedInput] = DeriveJsonEncoder.gen[ExpectedInput] // needed to keep tapir happy

  given Schema[ExpectedInput] = inlineSchema(Schema.derived)


  sealed trait OutputBody
  case class Success(
    message: String
  ) extends OutputBody
  case class NotFound(textResponse: String) extends OutputBody

  given Schema[Success] = inlineSchema(Schema.derived)

  given JsonCodec[Success] = DeriveJsonCodec.gen[Success]
  given JsonCodec[NotFound] = DeriveJsonCodec.gen[NotFound]
  given JsonCodec[OutputBody] = DeriveJsonCodec.gen[OutputBody]

}
