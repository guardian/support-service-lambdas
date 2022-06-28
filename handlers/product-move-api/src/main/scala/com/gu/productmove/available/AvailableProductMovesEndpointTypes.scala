package com.gu.productmove.available

import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object AvailableProductMovesEndpointTypes {

  case class ExpectedInput(uat: Boolean)

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]
  given JsonEncoder[ExpectedInput] = DeriveJsonEncoder.gen[ExpectedInput] // needed to keep tapir happy

  case class OutputBody(message: String)

  given JsonEncoder[OutputBody] = DeriveJsonEncoder.gen[OutputBody]
  given JsonDecoder[OutputBody] = DeriveJsonDecoder.gen[OutputBody] // needed to keep tapir happy

}
