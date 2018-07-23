package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

class StepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)
  "it" should "run end to end with fakes" in {

    val expectedIn = CreateReq(
      ZuoraAccountId("acccc"),
      123,
      LocalDate.of(2018, 7, 18),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeCreate(in: CreateSubscription.CreateReq): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeCheck(accountId: ZuoraAccountId): ApiGatewayOp[Unit] =
      if (accountId.value == "acccc") ContinueProcessing(())
      else ReturnWithResponse(ApiGatewayResponse.internalServerError(s"whoops: $accountId was wrong for prereq check"))

    val requestInput = JsObject(Map(
      "acquisitionCase" -> JsString("case"),
      "amountMinorUnits" -> JsNumber(123),
      "startDate" -> JsString("2018-07-18"),
      "zuoraAccountId" -> JsString("acccc"),
      "acquisitionSource" -> JsString("CSR"),
      "createdByCSR" -> JsString("bob")

    ))

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val actual = Steps.addSubscriptionSteps(fakeCheck, fakeCreate)(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}
