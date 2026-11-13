package com.gu.productmove.zuora.model

import zio.json.{JsonDecoder, JsonEncoder}

import scala.util.matching.Regex

/**
 * zuora order numbers must be of the form O-[numbers]
 */
opaque type OrderNumber = String

object OrderNumber {
  private val Format: Regex = "^O-[0-9]+$".r

  def apply(value: String): OrderNumber =
    parse(value).fold(error => throw new IllegalArgumentException(error), identity)

  def parse(value: String): Either[String, OrderNumber] =
    Either.cond(Format.matches(value), value, s"Invalid OrderNumber: '$value' (expected format 'O-<digits>')")

  extension (orderNumber: OrderNumber) def value: String = orderNumber

  given JsonDecoder[OrderNumber] = JsonDecoder.string.mapOrFail(parse)
  given JsonEncoder[OrderNumber] = JsonEncoder.string
}
