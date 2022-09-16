package com.gu.productmove.endpoint.available

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpoint.localDateToString
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.{AvailableMoves, OutputBody}
import com.gu.productmove.endpoint.available.Currency.GBP
import com.gu.productmove.endpoint.available.TimeUnit.*
import com.gu.productmove.framework.InlineSchema.inlineSchema
import com.gu.productmove.zuora.ZuoraProductRatePlan
import sttp.tapir.Schema.*
import sttp.tapir.Schema.annotations.*
import sttp.tapir.SchemaType.{SProductField, SString}
import sttp.tapir.Validator.Enumeration
import sttp.tapir.generic.Derived
import sttp.tapir.{FieldName, Schema, SchemaType, Validator}
import zio.{IO, ZIO}
import zio.json.*

import java.time.LocalDate
import scala.util.Try

//has to be a separate file due to https://github.com/lampepfl/dotty/issues/12498#issuecomment-973991160
object AvailableProductMovesEndpointTypes {

  sealed trait OutputBody
  case class AvailableMoves(body: List[MoveToProduct]) extends OutputBody
  case class NotFound(textResponse: String) extends OutputBody
  case object InternalServerError extends OutputBody

  given JsonCodec[AvailableMoves] = DeriveJsonCodec.gen[AvailableMoves]
  given JsonCodec[NotFound] = DeriveJsonCodec.gen[NotFound]
  given JsonCodec[OutputBody] = DeriveJsonCodec.gen[OutputBody]

}

given JsonCodec[Option[String]] = JsonCodec.string.transform( s =>
  s match {
    case null | "" => None
    case s         => Some(s)
  },
  _.getOrElse(""))

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

  def buildResponseFromRatePlan(subscriptionName: String, productRatePlan: ZuoraProductRatePlan, chargedThroughDate: LocalDate): IO[OutputBody, MoveToProduct] =
    for {
      billingPeriod <- ZIO.fromOption(productRatePlan.productRatePlanCharges.head.billingPeriod).orElse(ZIO.log(s"billingPeriod is null for subscription: $subscriptionName").flatMap(_ => ZIO.fail(AvailableMoves(List()))))
      pricing <- ZIO.fromOption(productRatePlan.productRatePlanCharges.head.pricing.find(_.currency == "GBP")).orElse(ZIO.log(s"currency not found on ratePlanCharge").flatMap(_ => ZIO.fail(AvailableMoves(List()))))
      price  = pricing.priceMinorUnits

      introOffer = Offer(Billing(amount = None, percentage = Some(50), currency = None, frequency = None, startDate = Some(localDateToString.format(chargedThroughDate))), TimePeriod(TimeUnit.month, 3))
      newPlan = Billing(amount = Some(price.toInt), percentage = None, currency = Some(GBP), frequency = Some(TimePeriod(TimeUnit.fromString(billingPeriod), 1)), startDate = Some(localDateToString.format(chargedThroughDate.plusDays(90))))
    } yield MoveToProduct(id = productRatePlan.id, name = "Digital Pack", trial = Some(Trial(dayCount = 14)), introOffer = Some(introOffer), billing = newPlan)
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
  currency: Option[Currency],    // optional if the ratePlan is a percentage discount
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
  // The MVP only accepts GBP
  case GBP extends Currency("GBP", "£")
  case USD extends Currency("USD", "$")
  case AUD extends Currency("AUD", "$")
  case NZD extends Currency("NZD", "$")
  case CAD extends Currency("CAD", "$")
  case EUR extends Currency("EUR", "€")
  case UnrecognizedCurrency extends Currency("", "")

object Currency {
  val websiteSupportedCurrencies = List(
    GBP,
    USD,
    AUD,
    CAD,
    EUR,
    NZD,
  )

  def currencyCodetoObject(code: String): Currency = {
    // add some logging here, do we need to log via the ZIO library??
    websiteSupportedCurrencies.find(_.code == code).getOrElse(Currency.UnrecognizedCurrency)
  }

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
  given JsonCodec[TimeUnit] = DeriveJsonCodec.gen[TimeUnit]

  given Schema[TimeUnit] =
    inlineSchema(Schema.derivedEnumeration())

  def fromString(billingPeriod: String): TimeUnit = {
    billingPeriod match {
      case "Month" => TimeUnit.month
      case "Annual" => TimeUnit.year
    }
  }


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
