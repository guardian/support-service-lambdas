package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.OutputBody
import com.gu.productmove.framework.InlineSchema.inlineSchema
import com.gu.productmove.endpoint.available.{Currency, MoveToProduct}
import java.time.LocalDate
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.{description, encodedName}
import sttp.tapir.generic.{Configuration, Derived}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import sttp.tapir.Schema

import scala.deriving.Mirror

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object ProductMoveEndpointTypes {

  case class ExpectedInput(
      @description("Price of new Supporter Plus subscription") price: BigDecimal,
      @description("Whether to preview the move or to carry it out") preview: Boolean,
      @description(
        "The User Id of the CSR performing the Switch. Populated only if the request comes from Salesforce",
      ) csrId: Option[String],
      @description(
        "The Case Id of the Salesforce Case related to the Switch. Populated only if the request comes from Salesforce",
      ) caseId: Option[String],
  )

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]
  given JsonEncoder[ExpectedInput] = DeriveJsonEncoder.gen[ExpectedInput] // needed to keep tapir happy

  given Schema[ExpectedInput] = inlineSchema(Schema.derived)

  sealed trait OutputBody
  case class Success(
      @description("Success message.") message: String,
  ) extends OutputBody
  case class PreviewResult(
      @description("The amount payable by the customer today") amountPayableToday: BigDecimal,
      @description("The amount refunded from the cancelled contribution") contributionRefundAmount: BigDecimal,
      @description("The cost of the new supporter plus subscription") supporterPlusPurchaseAmount: BigDecimal,
      @description(
        "The next payment date of the new supporter plus subscription, i.e.: the second payment date",
      ) nextPaymentDate: LocalDate,
  ) extends OutputBody
  case class InternalServerError(@description("Error message.") message: String) extends OutputBody
  given Schema[Success] = inlineSchema(Schema.derived)
  given Schema[PreviewResult] = inlineSchema(Schema.derived)
  given Schema[InternalServerError] = inlineSchema(Schema.derived)
  given JsonEncoder[Success] = DeriveJsonEncoder.gen[Success]
  given JsonDecoder[Success] = DeriveJsonDecoder.gen[Success] // needed to keep tapir happy
  given JsonEncoder[PreviewResult] = DeriveJsonEncoder.gen[PreviewResult]
  given JsonDecoder[PreviewResult] = DeriveJsonDecoder.gen // needed to keep tapir happy
  given JsonEncoder[OutputBody] = DeriveJsonEncoder.gen[OutputBody]
  given JsonDecoder[OutputBody] = DeriveJsonDecoder.gen[OutputBody] // needed to keep tapir happy
  given JsonEncoder[InternalServerError] = DeriveJsonEncoder.gen[InternalServerError]
  given JsonDecoder[InternalServerError] = DeriveJsonDecoder.gen[InternalServerError] // needed to keep tapir happy
}
