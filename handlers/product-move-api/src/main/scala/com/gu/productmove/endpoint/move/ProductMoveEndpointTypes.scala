package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.OutputBody
import com.gu.productmove.framework.InlineSchema.inlineSchema
import com.gu.productmove.endpoint.available.{Currency, MoveToProduct}
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.{description, encodedName}
import sttp.tapir.generic.{Configuration, Derived}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import sttp.tapir.Schema

import scala.deriving.Mirror

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object ProductMoveEndpointTypes {

  case class ExpectedInput(
    @description("price of new Supporter Plus subscription") price: Double
  )

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]
  given JsonEncoder[ExpectedInput] = DeriveJsonEncoder.gen[ExpectedInput] // needed to keep tapir happy

  given Schema[ExpectedInput] = inlineSchema(Schema.derived)

  sealed trait OutputBody
  case class Success(
    @description("Success message.") message: String,
  ) extends OutputBody
  case class InternalServerError(message: String) extends OutputBody
  given Schema[Success] = inlineSchema(Schema.derived)
  given JsonEncoder[Success] = DeriveJsonEncoder.gen[Success]
  given JsonDecoder[Success] = DeriveJsonDecoder.gen[Success] // needed to keep tapir happy
  given JsonEncoder[OutputBody] = DeriveJsonEncoder.gen[OutputBody]
  given JsonDecoder[OutputBody] = DeriveJsonDecoder.gen[OutputBody] // needed to keep tapir happy
}
