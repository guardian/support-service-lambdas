package com.gu.holiday_stops

import com.gu.effects.{FakeFetchString, SFTestEffects, TestingRawEffects}
import com.gu.holiday_stops.Handler._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.config.Stage
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.Inside.inside
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsSuccess, Json}

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
  it should "calculate potential holiday stop dates" in {
    inside(
      Handler.operationForEffects(
        testEffects.response,
        Stage("DEV"),
        FakeFetchString.fetchString
      ).map { operation =>
        operation
          .steps(potentialIssueDateRequest("Guardian Weekly xxx", "2019-01-01", "2019-02-01"))
      }
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("200")
        inside(Json.fromJson[Array[String]](Json.parse(response.body))) {
          case JsSuccess(dates, _) =>
            dates should contain inOrderOnly(
              "2019-01-04", "2019-01-11", "2019-01-18", "2019-01-25", "2019-02-01"
            )
        }
    }
  }

  private def potentialIssueDateRequest(productPrefix: String, startDate: String, endDate: String) = {
    ApiGatewayRequest(
      Some("GET"),
      Some(Map("startDate" -> startDate, "endDate" -> endDate)),
      None,
      Some(Map("x-product-name-prefix" -> productPrefix)),
      None,
      Some("/potential"))
  }

  val testEffects = new TestingRawEffects(
    postResponses = Map(
      SFTestEffects.authSuccess
    )
  )
}
