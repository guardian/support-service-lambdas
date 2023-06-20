package com.gu.identityRetention

import com.gu.util.apigateway.ResponseModels.ApiResponse
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class IdentityRetentionApiResponsesTest extends AnyFlatSpec with Matchers {

  val today = LocalDate.parse("2023-05-31")

  "ongoingRelationship" should "calculate the deletion date 7 years after end date and response valid for 3 months" in {
    IdentityRetentionApiResponses.ongoingRelationship(
      latestLapsedDate = LocalDate.of(2024, 1, 1),
      today,
    ) shouldEqual ApiResponse(
      "200",
      """{
         |  "ongoingRelationship" : true,
         |  "relationshipEndDate" : "2024-01-01",
         |  "effectiveDeletionDate" : "2031-01-01",
         |  "responseValidUntil" : "2023-08-31"
         |}""".stripMargin,
    )
  }

  "cancelledRelationship" should "calculate the deletion date 7 years after cancellation date" in {
    IdentityRetentionApiResponses.lapsedRelationship(
      latestLapsedDate = LocalDate.of(2024, 1, 1),
      today,
    ) shouldEqual ApiResponse(
      "200",
      """{
        |  "ongoingRelationship" : false,
        |  "relationshipEndDate" : "2024-01-01",
        |  "effectiveDeletionDate" : "2031-01-01",
        |  "responseValidUntil" : "2023-08-31"
        |}""".stripMargin,
    )
  }

  it should "adjust the responseValidUntil if the effective deletion date is within three months of 'today'" in {
    IdentityRetentionApiResponses.lapsedRelationship(
      latestLapsedDate = LocalDate.of(2016, 7, 1),
      today,
    ) shouldEqual ApiResponse(
      "200",
      """{
        |  "ongoingRelationship" : false,
        |  "relationshipEndDate" : "2016-07-01",
        |  "effectiveDeletionDate" : "2023-07-01",
        |  "responseValidUntil" : "2023-07-01"
        |}""".stripMargin,
    )
  }

  it should "not adjust the responseValidUntil if the effective deletion date is in the past" in {
    IdentityRetentionApiResponses.lapsedRelationship(
      latestLapsedDate = LocalDate.of(2015, 1, 1),
      today,
    ) shouldEqual ApiResponse(
      "200",
      """{
        |  "ongoingRelationship" : false,
        |  "relationshipEndDate" : "2015-01-01",
        |  "effectiveDeletionDate" : "2022-01-01",
        |  "responseValidUntil" : "2023-08-31"
        |}""".stripMargin,
    )
  }

  "canBeDeleted" should "return a message and 404 status" in {
    IdentityRetentionApiResponses.canBeDeleted shouldEqual ApiResponse(
      "404",
      """{
        |  "message" : "User has no active relationships"
        |}""".stripMargin,
    )
  }

}
