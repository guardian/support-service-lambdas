package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.OutputBody
import com.gu.productmove.framework.InlineSchema.inlineSchema
import com.gu.productmove.endpoint.available.{Currency, MoveToProduct}

import java.time.LocalDate
import sttp.tapir.Schema
import sttp.tapir.Schema.annotations.{description, encodedName}
import sttp.tapir.generic.{Configuration, Derived}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonCodec, JsonDecoder, JsonEncoder}
import sttp.tapir.Schema

import scala.deriving.Mirror

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object ProductMoveEndpointTypes {

  val TransactionErrorStatusCode = sttp.model.StatusCode(430)

  case class ExpectedInput(
      @description("Price of new Supporter Plus subscription") price: BigDecimal,
      @description("Whether to preview the move or to carry it out") preview: Boolean,
      @description(
        "The User Id of the CSR performing the Switch. Populated only if the request comes from Salesforce",
      ) csrUserId: Option[String],
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
      derives JsonCodec
  case class PreviewResult(
      @description("The amount payable by the customer today") amountPayableToday: BigDecimal,
      @description(
        "Whether or not the amount needs to be calculated before switching the product",
      ) checkChargeAmountBeforeUpdate: Boolean,
      @description("The amount refunded from the cancelled contribution") contributionRefundAmount: BigDecimal,
      @description("The cost of the new supporter plus subscription") supporterPlusPurchaseAmount: BigDecimal,
      @description(
        "The next payment date of the new supporter plus subscription, i.e.: the second payment date",
      ) nextPaymentDate: LocalDate,
  ) extends OutputBody
      derives JsonCodec

  case class BadRequest(@description("Error message.") message: String) extends ErrorResponse derives JsonCodec

  case class InternalServerError(@description("Error message.") message: String) extends ErrorResponse derives JsonCodec

  sealed trait ErrorResponse extends OutputBody
  case class TransactionError(@description("Error message.") message: String) extends ErrorResponse derives JsonCodec
  case class SecretsError(@description("Error message.") message: String) extends ErrorResponse derives JsonCodec

  given Schema[Success] = inlineSchema(Schema.derived)
  given Schema[PreviewResult] = inlineSchema(Schema.derived)
  given Schema[InternalServerError] = inlineSchema(Schema.derived)
  given Schema[BadRequest] = inlineSchema(Schema.derived)
  given Schema[TransactionError] = inlineSchema(Schema.derived)
  given Schema[SecretsError] = inlineSchema(Schema.derived)

}
