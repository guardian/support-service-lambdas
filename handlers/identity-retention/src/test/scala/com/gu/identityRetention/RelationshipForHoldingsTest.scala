package com.gu.identityRetention

import com.gu.identityRetention.Types.ProductHolding
import com.gu.util.apigateway.ResponseModels.ApiResponse
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class RelationshipForHoldingsTest extends AnyFlatSpec with Matchers {

  val today = LocalDate.parse("2023-05-31")

  "RelationshipForHoldings" should "return a 'can be deleted' response if there are no holdings" in {
    RelationshipForHoldings(Nil) shouldEqual ApiResponse(
      statusCode = "404",
      body = """{
               |  "message" : "User has no active relationships"
               |}""".stripMargin,
    )
  }

  it should "return a 'ongoing relationship' response for the longest lasting active holdings" in {
    val holdings = List(
      ProductHolding(
        identityId = "1234",
        ongoingRelationship = true,
        effectiveLapsedDate = LocalDate.parse("2024-01-01"),
      ),
      ProductHolding(
        identityId = "1234",
        ongoingRelationship = true,
        effectiveLapsedDate = LocalDate.parse("2024-02-01"),
      ),
      ProductHolding(
        identityId = "1234",
        ongoingRelationship = false,
        effectiveLapsedDate = LocalDate.parse("2023-01-01"),
      ),
    )
    RelationshipForHoldings(holdings, today) shouldEqual ApiResponse(
      statusCode = "200",
      body = """{
               |  "ongoingRelationship" : true,
               |  "relationshipEndDate" : "2024-02-01",
               |  "effectiveDeletionDate" : "2031-02-01",
               |  "responseValidUntil" : "2023-08-31"
               |}""".stripMargin,
    )
  }

  it should "return the most recent lapsed date if there are no active holdings" in {
    val holdings = List(
      ProductHolding(
        identityId = "1234",
        ongoingRelationship = false,
        effectiveLapsedDate = LocalDate.parse("2024-03-01"),
      ),
      ProductHolding(
        identityId = "1234",
        ongoingRelationship = false,
        effectiveLapsedDate = LocalDate.parse("2023-04-01"),
      ),
    )
    RelationshipForHoldings(holdings, today) shouldEqual ApiResponse(
      statusCode = "200",
      body = """{
               |  "ongoingRelationship" : false,
               |  "relationshipEndDate" : "2024-03-01",
               |  "effectiveDeletionDate" : "2031-03-01",
               |  "responseValidUntil" : "2023-08-31"
               |}""".stripMargin,
    )
  }
}
