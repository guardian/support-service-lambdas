package com.gu.zuora.retention.query

import java.time.LocalDate
import org.scalatest.AsyncFlatSpec
import play.api.libs.json.Json
import org.scalatest.Matchers._


class RetentionQueryRequestTest extends AsyncFlatSpec {

    val jsonRequest = Json.parse(
      """{
        "cutOffDate" : "2012-11-03"
        |}""".stripMargin
    )

    it should "deserialise zuora retention query request " in {

      val expected = RetentionQueryRequest(LocalDate.of(2012,11,3))
      val actual = jsonRequest.as[RetentionQueryRequest]

      actual.shouldBe(expected)

    }

  }


