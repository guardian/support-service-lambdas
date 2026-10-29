package com.gu.util.zuora

import play.api.libs.json.{JsonValidationError, Reads}

final case class OrderNumber(value: String) extends AnyVal

object OrderNumber {
  implicit val reads: Reads[OrderNumber] =
    Reads.StringReads
      .filter(JsonValidationError("Expected order number O-<digits>"))(_.matches("O-[0-9]+"))
      .map(OrderNumber(_))
}
