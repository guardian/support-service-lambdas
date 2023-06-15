package com.gu.identityRetention

import com.google.cloud.bigquery.{Field, FieldList, FieldValue, FieldValueList, StandardSQLTypeName}
import com.gu.identityRetention.Types.ProductHolding
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import scala.jdk.CollectionConverters._

import java.time.LocalDate

class GetActiveProductHoldingsTest extends AnyFlatSpec with Matchers {

  "toProductHolding" should "convert db result to case class" in {
    val expected = ProductHolding(
      identityId = "12345",
      ongoingRelationship = false,
      effectiveLapsedDate = LocalDate.of(2023, 1, 1),
    )
    val fieldValues = List(
      FieldValue.of(FieldValue.Attribute.PRIMITIVE, "12345"),
      FieldValue.of(FieldValue.Attribute.PRIMITIVE, "false"),
      FieldValue.of(FieldValue.Attribute.PRIMITIVE, "2023-01-01"),
    )
    val schema = List(
      Field.of("identity_id", StandardSQLTypeName.STRING),
      Field.of("ongoing_relationship", StandardSQLTypeName.BOOL),
      Field.of("effective_lapsed_date", StandardSQLTypeName.DATE),
    )
    val row = FieldValueList.of(fieldValues.asJava, FieldList.of(schema.asJava))
    GetActiveProductHoldings.toProductHolding(row) shouldEqual expected
  }

  "getDateValue" should "parse a date field" in {
    val fieldValue = FieldValue.of(FieldValue.Attribute.PRIMITIVE, "2023-01-01")
    GetActiveProductHoldings.getDateValue(fieldValue) shouldEqual LocalDate.of(2023, 1, 1)
  }
}
