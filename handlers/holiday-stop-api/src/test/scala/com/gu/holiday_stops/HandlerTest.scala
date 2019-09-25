package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.effects.{FakeFetchString, SFTestEffects, TestingRawEffects}
import com.gu.holiday_stops.ActionCalculator._
import com.gu.holiday_stops.Handler._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.salesforce.holiday_stops.{SalesForceHolidayStopsEffects, SalesforceHolidayStopRequestsDetail}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.config.Stage
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.softwaremill.sttp.testing.SttpBackendStub
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
  "GET /potential/<<sub name>>?startDate=...&endDate=...&estimateCredit=false&productType=..." +
    "&productRatePlanName=... endpoint" should
    "calculate potential holiday stop dates" in {
    inside(
      Handler.operationForEffects(
        defaultTestEffects.response,
        Stage("DEV"),
        FakeFetchString.fetchString,
        SttpBackendStub.synchronous
      ).map { operation =>
        operation
          .steps(
            potentialIssueDateRequest(
              productType = "Newspaper - Voucher Book",
              productRatePlanName = "Sunday",
              startDate = "2019-01-01",
              endDate = "2019-01-15",
              subscriptionName = "Sub12344",
              estimateCredit = false
            )
          )
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
                  PotentialHolidayStop(LocalDate.of(2019, 1, 6), None),
                  PotentialHolidayStop(LocalDate.of(2019, 1, 13), None),
                )
              )
            )
        }
    }
  }
  it should "return bad request if method is missing" in {
    inside(
      Handler
        .operationForEffects(
          defaultTestEffects.response,
          Stage("DEV"),
          FakeFetchString.fetchString,
          SttpBackendStub.synchronous
        )
        .map(_.steps(ApiGatewayRequest(None, None, None, None, None, None)))
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("400")
        response.body should equal(
          """{
            |  "message" : "Bad request: Http method is required"
            |}""".stripMargin
        )
    }
  }
  it should "return bad request if path is missing" in {
    inside(
      Handler
        .operationForEffects(
          defaultTestEffects.response,
          Stage("DEV"),
          FakeFetchString.fetchString,
          SttpBackendStub.synchronous
        )
        .map(_.steps(ApiGatewayRequest(Some("GET"), None, None, None, None, None)))
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("400")
        response.body should equal(
          """{
            |  "message" : "Bad request: Path is required"
            |}""".stripMargin
        )
    }
  }
  "GET /hsr/<<sub name>>?productType=...&ratePlanName=... endpoint" should
    "get subscription and calculate product specifics for product type and rate plan name query params" in {
    val testBackend = SttpBackendStub.synchronous

    val subscriptionName = "Sub12344"
    val contactId = "Contact1234"
    val holidayStopRequestsDetail = Fixtures.mkHolidayStopRequestDetails()

    val holidayStopRequest = Fixtures.mkHolidayStopRequest(
      id = "holidayStopId",
      subscriptionName = SubscriptionName(subscriptionName),
      requestDetail = List(holidayStopRequestsDetail)
    )

    inside(
      Handler.operationForEffects(
        new TestingRawEffects(
          responses = Map(
            SalesForceHolidayStopsEffects.listHolidayStops(contactId, subscriptionName, List(holidayStopRequest))
          ),
          postResponses = Map(
            SFTestEffects.authSuccess,
          )
        ).response,
        Stage("DEV"),
        FakeFetchString.fetchString,
        testBackend
      ).map { operation =>
        operation
          .steps(
            existingHolidayStopsRequest(
              subscriptionName,
              contactId,
              "Newspaper - Voucher Book",
              "Sunday"
            )
          )
      }
    ) {
      case ContinueProcessing(response) =>
        response.statusCode should equal("200")
        val parsedResponseBody = Json.fromJson[GetHolidayStopRequests](Json.parse(response.body))
        inside(parsedResponseBody) {
          case JsSuccess(response, _) =>
            response should equal(
              GetHolidayStopRequests(
                List(
                  HolidayStopRequestFull(
                    holidayStopRequest.Id.value,
                    holidayStopRequest.Start_Date__c.value,
                    holidayStopRequest.End_Date__c.value,
                    holidayStopRequest.Subscription_Name__c,
                    List(toHolidayStopRequestDetail(holidayStopRequestsDetail))
                  )
                ),
                List(
                  IssueSpecifics(
                    SundayVoucherIssueSuspensionConstants.firstAvailableDate(LocalDate.now()),
                    SundayVoucherIssueSuspensionConstants.issueDayOfWeek.getValue
                  )
                ),
                SundayVoucherSuspensionConstants.annualIssueLimit
              )
            )

        }
    }
  }

  private def toHolidayStopRequestDetail(holidayStop: SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail) = {
    HolidayStopRequestsDetail(
      holidayStop.Stopped_Publication_Date__c.value,
      holidayStop.Estimated_Price__c.map(_.value),
      holidayStop.Actual_Price__c.map(_.value),
    )
  }

  private def potentialIssueDateRequest(productType: String, productRatePlanName: String, startDate: String,
                                        endDate: String, subscriptionName: String, estimateCredit: Boolean) = {
    ApiGatewayRequest(
      Some("GET"),
      Some(Map(
        "startDate" -> startDate,
        "endDate" -> endDate,
        "estimateCredit" -> (if (estimateCredit) "true" else "false"),
        "productType" -> productType,
        "productRatePlanName" -> productRatePlanName
      )),
      None,
      None,
      Some(JsObject(Seq("subscriptionName" -> JsString(subscriptionName)))),
      Some(s"/potential/$subscriptionName ")
    )
  }

  private def existingHolidayStopsRequest(subscriptionName: String, sfContactId: String, productType: String, produtRatePlanName: String) = {
    ApiGatewayRequest(
      Some("GET"),
      Some(Map(
        "productType" -> productType,
        "productRatePlanName" -> produtRatePlanName
      )),
      None,
      Some(Map("x-salesforce-contact-id" -> sfContactId)),
      Some(JsObject(Seq("subscriptionName" -> JsString(subscriptionName)))),
      Some(s"/hsr/$subscriptionName ")
    )
  }

  val defaultTestEffects = new TestingRawEffects(
    postResponses = Map(
      SFTestEffects.authSuccess
    )
  )
}
