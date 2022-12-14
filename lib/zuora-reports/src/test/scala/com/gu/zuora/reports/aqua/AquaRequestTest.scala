package com.gu.zuora.reports.aqua
import org.scalatest._
import play.api.libs.json.Json
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class AquaRequestTest extends AsyncFlatSpec {

  val expectedJson = Json.parse(
    """{
      |"format" : "csv",
      |"version" : "1.0",
      |"name" : "TestQuery",
      |"encrypted" : "none",
      |"useQueryLabels" : "true",
      |"dateTimeUtc" : "true",
      |"queries" : [{
      |	"name" : "query1",
      |	"query" : "select something from somethingElse",
      |	"type" : "zoqlexport"
      |},
      |{
      |	"name" : "query2",
      |	"query" : "select anotherThing from yetAnotherThing",
      |	"type" : "zoqlexport"
      |}]
      |}""".stripMargin,
  )

  it should "serialise aqua request " in {
    val aquaQueryRequest = AquaQueryRequest(
      name = "TestQuery",
      queries = List(
        AquaQuery("query1", "select something from somethingElse"),
        AquaQuery("query2", "select anotherThing from yetAnotherThing"),
      ),
    )
    val actual = Json.toJson(aquaQueryRequest)
    actual shouldBe expectedJson
  }

}
