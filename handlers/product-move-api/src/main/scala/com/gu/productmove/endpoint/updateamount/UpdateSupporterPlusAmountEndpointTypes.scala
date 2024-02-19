package com.gu.productmove.endpoint.updateamount

import com.gu.productmove.framework.InlineSchema.inlineSchema
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.{description, encodedName}
import sttp.tapir.generic.Configuration
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonCodec, JsonDecoder, JsonEncoder}

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object UpdateSupporterPlusAmountEndpointTypes {
  case class ExpectedInput(
      @description("updated supporter plus amount requested by the supporter") newPaymentAmount: BigDecimal,
  ) derives JsonCodec

  given Schema[ExpectedInput] = inlineSchema(Schema.derived)

  sealed trait OutputBody derives JsonCodec
  case class Success(
      @description("Success message.") message: String,
  ) extends OutputBody
      derives JsonCodec

  given Schema[Success] = inlineSchema(Schema.derived)

}
