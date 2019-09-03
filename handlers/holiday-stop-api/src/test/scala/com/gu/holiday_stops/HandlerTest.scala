package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.effects.{FakeFetchString, SFTestEffects, TestingRawEffects}
import com.gu.holiday_stops.Handler._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.config.Stage
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.Inside.inside
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString, JsSuccess, Json}

class HandlerTest extends FlatSpec with Matchers {

  it should s"convert either the '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' header to Contact or fail" in {

    Handler.extractContactFromHeaders(None) shouldBe a[ReturnWithResponse]
    Handler.extractContactFromHeaders(Some(Map())) shouldBe a[ReturnWithResponse]

    val expectedIdentityIdCoreValue = "identity_id"
    Handler.extractContactFromHeaders(Some(Map(
      HEADER_IDENTITY_ID -> expectedIdentityIdCoreValue
    ))) shouldBe ContinueProcessing(Left(IdentityId(expectedIdentityIdCoreValue)))

    val expectedSfContactIdCoreValue = "sf_contact_id"
    Handler.extractContactFromHeaders(Some(Map(
      HEADER_SALESFORCE_CONTACT_ID -> expectedSfContactIdCoreValue
    ))) shouldBe ContinueProcessing(Right(SalesforceContactId(expectedSfContactIdCoreValue)))
  }
  "GET /potential?startDate=...&endDate=... endpoint" should "calculate potential holiday stop dates" in {
    inside(
      Handler.operationForEffects(testEffects.response, Stage("DEV"), FakeFetchString.fetchString).map { operation =>
        operation.steps(potentialIssueDateV1Request(
          productPrefix = "Guardian Weekly xxx",
          startDate = "2019-01-01",
          endDate = "2019-01-15"
        ))
      }
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("200")
        inside(Json.fromJson[Array[String]](Json.parse(response.body))) {
          case JsSuccess(dates, _) =>
            dates should contain inOrderOnly("2019-01-04", "2019-01-11")
        }
    }
  }
  "GET /potential/<<sub name>>?startDate=...&endDate=...&estimateCredit=false endpoint" should
    "calculate potential holiday stop dates" in {
    inside(
      Handler.operationForEffects(
        testEffects.response,
        Stage("DEV"),
        FakeFetchString.fetchString
      ).map { operation =>
        operation
          .steps(potentialIssueDateV2Request(
            productPrefix = "Guardian Weekly xxx",
            startDate = "2019-01-01",
            endDate = "2019-01-15",
            subscriptionName = "Sub12344",
            estimateCredit = false
          ))
      }
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("200")
        val parsedResponseBody = Json.fromJson[PotentialHolidayStopsResponse](Json.parse(response.body))
        inside(parsedResponseBody) {
          case JsSuccess(response, _) =>
            response should equal(
              PotentialHolidayStopsResponse(
                List(
                  PotentialHolidayStop(LocalDate.of(2019, 1, 4), None),
                  PotentialHolidayStop(LocalDate.of(2019, 1, 11), None),
                )
              )
            )
        }
    }
  }
  "GET /potential/<<sub name>>?startDate=...&endDate=...&estimateCredit=true endpoint" should
    "calculate potential holiday stop dates" in {
    inside(
      Handler.operationForEffects(
        testEffects.response,
        Stage("DEV"),
        FakeFetchString.fetchString
      ).map { operation =>
        operation
          .steps(potentialIssueDateV2Request(
            productPrefix = "Guardian Weekly xxx",
            startDate = "2019-01-01",
            endDate = "2019-01-15",
            subscriptionName = "Sub12344",
            estimateCredit = true
          ))
      }
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("200")
        val parsedResponseBody = Json.fromJson[PotentialHolidayStopsResponse](Json.parse(response.body))
        inside(parsedResponseBody) {
          case JsSuccess(response, _) =>
            response should equal(
              PotentialHolidayStopsResponse(
                List(
                  PotentialHolidayStop(LocalDate.of(2019, 1, 4), Some(-1.23)),
                  PotentialHolidayStop(LocalDate.of(2019, 1, 11), Some(-1.23)),
                )
              )
            )
        }
    }
  }
  it should "return bad request if method is missing" in {
    inside(
      Handler.operationForEffects(testEffects.response, Stage("DEV"), FakeFetchString.fetchString)
        .map(_.steps(ApiGatewayRequest(None, None, None, None, None, None)))
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("400")
        response.body should equal(
          """{
            |  "message" : "Bad request: Http method is required"
            |}""".stripMargin)
    }
  }
  it should "return bad request if path is missing" in {
    inside(
      Handler.operationForEffects(testEffects.response, Stage("DEV"), FakeFetchString.fetchString)
        .map(_.steps(ApiGatewayRequest(Some("GET"), None, None, None, None, None)))
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("400")
        response.body should equal(
          """{
            |  "message" : "Bad request: Path is required"
            |}""".stripMargin)
    }
  }

  private def potentialIssueDateV1Request(productPrefix: String, startDate: String, endDate: String) = {
    ApiGatewayRequest(
      Some("GET"),
      Some(Map("startDate" -> startDate, "endDate" -> endDate)),
      None,
      Some(Map("x-product-name-prefix" -> productPrefix)),
      None,
      Some("/potential")
    )
  }

  private def potentialIssueDateV2Request(productPrefix: String, startDate: String, endDate: String,
                                          subscriptionName: String, estimateCredit: Boolean) = {
    ApiGatewayRequest(
      Some("GET"),
      Some(Map(
        "startDate" -> startDate,
        "endDate" -> endDate,
        "estimateCredit" -> (if (estimateCredit) "true" else "false"))),
      None,
      Some(Map("x-product-name-prefix" -> productPrefix)),
      Some(JsObject(Seq("subscriptionName" -> JsString(subscriptionName)))),
      Some(s"/potential/$subscriptionName ")
    )
  }

  val testEffects = new TestingRawEffects(
    postResponses = Map(
      SFTestEffects.authSuccess
    )
  )
}
