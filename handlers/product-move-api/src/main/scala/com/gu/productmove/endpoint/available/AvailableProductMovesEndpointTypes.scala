package com.gu.productmove.endpoint.available

import com.gu.productmove.endpoint.available.TimeUnit.*
import com.gu.productmove.framework.InlineSchema.inlineSchema
import sttp.tapir.Schema.*
import sttp.tapir.Schema.annotations.*
import sttp.tapir.SchemaType.{SProductField, SString}
import sttp.tapir.Validator.Enumeration
import sttp.tapir.generic.Derived
import sttp.tapir.{FieldName, Schema, SchemaType, Validator}
import zio.json.{DeriveJsonCodec, JsonCodec}

import scala.util.Try

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object AvailableProductMovesEndpointTypes {

  sealed trait OutputBody
  case class Success(body: List[MoveToProduct]) extends OutputBody
  case class NotFound(textResponse: String) extends OutputBody

  given JsonCodec[Success] = DeriveJsonCodec.gen[Success]
  given JsonCodec[NotFound] = DeriveJsonCodec.gen[NotFound]
  given JsonCodec[OutputBody] = DeriveJsonCodec.gen[OutputBody]

}

object MoveToProduct {

  given JsonCodec[MoveToProduct] = DeriveJsonCodec.gen[MoveToProduct]
  given Schema[MoveToProduct] = Schema.derived

  given JsonCodec[Billing] = DeriveJsonCodec.gen[Billing]
  given Schema[Billing] = Schema.derived

  given JsonCodec[Trial] = DeriveJsonCodec.gen[Trial]
  given Schema[Trial] = Schema.derived

  given JsonCodec[Offer] = DeriveJsonCodec.gen[Offer]
  given Schema[Offer] = Schema.derived

  given JsonCodec[TimePeriod] = DeriveJsonCodec.gen[TimePeriod]
  given Schema[TimePeriod] = Schema.derived

}

@encodedName("product")
@description("A product that's available for subscription.")
case class MoveToProduct(
  @description("ID of product in Zuora product catalogue.")
  id: String,
  @description("Name of product in Zuora product catalogue.")
  @encodedExample("Digital Pack")
  name: String,
  billing: Billing,
  trial: Option[Trial],
  introOffer: Option[Offer],
)

@encodedName("billing")
@description("Amount and frequency of billing.")
case class Billing(
  @description("Absolute amount that will be billed in pence or cents etc.\nEither this field or the percentage field will be populated.")
  @encodedExample(1199)
  amount: Option[Int],
  @description("Percentage of standard amount that will be billed.\nThis field only makes sense if the billing object is attached to an introductory offer.\nEither this field or the amount field will be populated.")
  @encodedExample(50)
  percentage: Option[Int], // Either - amount or percentage?
  @validate[Currency](Validator.enumeration(List(Currency.GBP)))
  currency: Currency,
  frequency: Option[TimePeriod],
  @description("Date on which first service period for product subscription begins.\nThis probably won't be known reliably before a subscription has actually been set up,\nso it's an optional field.\nIn ISO 8601 format.")
  @encodedExample("2022-06-21")
  startDate: Option[String], // LocalDate?
)

// tapir doesn't support scala 3 enums (yet), hence the need for custom codec https://github.com/softwaremill/tapir/pull/1824#discussion_r913111720
enum Currency(
  val code: String,
  val symbol: String
):
  case GBP extends Currency("GBP", "£")
object Currency {
  given JsonCodec[Currency] = JsonCodec[Map[String, String]].transformOrFail[Currency](
    _.get("code").toRight("no code in currency object").flatMap(code => Try(Currency.valueOf(code)).toEither.left.map(_.toString)),
    c => Map("code" -> c.code, "symbol" -> c.symbol)
  )
  given Schema[Currency] =
    Schema[Currency](
      SchemaType.SProduct[Currency](
        List(
          SProductField(FieldName("code"), Schema(SString(), encodedExample = Some("GBP"), description = Some("ISO 4217 alphabetic currency code.")), (c: Currency) => None),
          SProductField(FieldName("symbol"), Schema(SString(), encodedExample = Some("£"), description = Some("ISO 4217 currency symbol.")), (c: Currency) => None),
        )
      )
    )
}

// tapir doesn't support scala 3 enums (yet), hence the need for custom codec https://github.com/softwaremill/tapir/pull/1824#discussion_r913111720
enum TimeUnit:
  case month, year

object TimeUnit:

  given JsonCodec[TimeUnit] = summon[JsonCodec[String]].transform[TimeUnit]({
    case "month" => TimeUnit.month
    case "year" => TimeUnit.year
  }, _.toString)

  given Schema[TimeUnit] =
    inlineSchema(Schema.derivedEnumeration())


@encodedName("trial")
@description("An optional free trial that begins when a subscription begins\nand lasts for a given number of days.")
case class Trial(
  @description("Number of days that free trial lasts.")
  @encodedExample(14)
  dayCount: Int,
)

@encodedName("offer")
@description("An optional special offer that begins either when a subscription begins\nor at the end of a free trial\nand lasts for a given period of time.")
case class Offer(
  billing: Billing,
  duration: TimePeriod,
)

@encodedName("timePeriod")
case class TimePeriod(
  @description("Time unit.")
  @encodedExample("month")
  @validate(
    Validator.enumeration(
      List[com.gu.productmove.endpoint.available.TimeUnit](TimeUnit.month, TimeUnit.year),
      tu => Some(tu.toString)
    ))
  name: TimeUnit,
  @description("Number of time units in this time period.")
  count: Int
)
