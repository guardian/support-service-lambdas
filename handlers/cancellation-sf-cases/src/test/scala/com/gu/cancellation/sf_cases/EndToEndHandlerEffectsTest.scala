package com.gu.cancellation.sf_cases

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.cancellation.sf_cases.Handler.{CasePathParams, SfBackendForIdentityCookieHeader, Steps}
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.IdentityCookieToIdentityUser.{IdentityId, IdentityUser}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.CaseWithId
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

import scala.util.Random

case class PartialApiResponse(statusCode: String, body: String)
case class GetCaseResponse(Description: String)

class EndToEndHandlerEffectsTest extends FlatSpec with Matchers {

  import com.gu.cancellation.sf_cases.EndToEndData._
  import com.gu.cancellation.sf_cases.Runner._

  def getCaseSteps(sfBackendForIdentityCookieHeader: SfBackendForIdentityCookieHeader)(apiGatewayRequest: ApiGatewayRequest) =
    (for {
      identityAndSfRequests <- sfBackendForIdentityCookieHeader(apiGatewayRequest.headers)
      pathParams <- apiGatewayRequest.pathParamsAsCaseClass[CasePathParams]()
      sfGet = SalesforceCase.GetById[JsValue](identityAndSfRequests.sfRequests)_
      getCaseResponse <- sfGet(pathParams.caseId).toApiGatewayOp("get case detail")
    } yield ApiGatewayResponse("200", getCaseResponse)).apiResponse

  it should "create a case, try to resume that case, update 'Description' field of the case and check the update worked" taggedAs EffectsTest in {

    // create case (which has new case ID in response body)
    val firstRaiseCaseResponse: CaseWithId = getResponse[CaseWithId](
      createCaseRequest,
      Handler.RaiseCase.steps
    )

    // try to raise another case, which should 'resume' that case (i.e. same ID)
    val secondRaiseCaseResponse: CaseWithId = getResponse[CaseWithId](
      createCaseRequest,
      Handler.RaiseCase.steps
    )

    firstRaiseCaseResponse.id shouldEqual secondRaiseCaseResponse.id

    val expectedDescription = "EndToEndTest"

    // update case by setting 'Description' field
    getResponse[JsValue](
      updateCaseRequest(firstRaiseCaseResponse.id.value, expectedDescription),
      Handler.UpdateCase.steps
    )

    // fetch the case to ensure the 'Description' field has been updated
    implicit val getDetailReads: Reads[GetCaseResponse] = Json.reads[GetCaseResponse]
    val getCaseDetailResponse = getResponse[GetCaseResponse](
      getCaseDetailRequest(firstRaiseCaseResponse.id.value),
      getCaseSteps
    )

    getCaseDetailResponse.Description shouldEqual expectedDescription

  }

}

object Runner extends Matchers {

  def fakeCookiesToIdentityUser(scGuU: String, guU: String) = {
    scGuU shouldEqual EndToEndData.scGuU
    guU shouldEqual EndToEndData.guU
    Some(IdentityUser(IdentityId("100000932"), None))
  }

  def getResponse[ResponseType](input: String, steps: Steps)(implicit reads: Reads[ResponseType]): ResponseType = {
    val stream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    //execute
    Handler.runForLegacyTestsSeeTestingMd(
      fakeCookiesToIdentityUser,
      steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(stream, os, null)
    )

    val parsed = Json.parse(new String(os.toByteArray, "UTF-8"))

    implicit val apiResponseReads: Reads[PartialApiResponse] = Json.reads[PartialApiResponse]
    val awsResponse: PartialApiResponse = Json.fromJson[PartialApiResponse](parsed) match {
      case JsSuccess(worked, _) => worked
      case jsError: JsError => fail(s"API Response did not contain body and statusCode : $jsError")
    }

    awsResponse.statusCode shouldEqual "200"

    Json.fromJson[ResponseType](Json.parse(awsResponse.body)) match {
      case JsSuccess(worked, _) => worked
      case jsError: JsError => fail(s"API Response body did not conform to desired type, see : $jsError")
    }

  }

}

object EndToEndData {

  val scGuU: String = "scGuU"
  val guU: String = "guU"

  private def ApiGatewayRequestPayloadBuilder(
    httpMethod: String,
    bodyString: String,
    pathSuffix: String = "",
    pathParameters: String = "null"
  ): String =
    s"""
       |{
       |    "resource": "/case${pathSuffix}",
       |    "path": "/case${pathSuffix}",
       |    "httpMethod": "${httpMethod}",
       |    "headers": {
       |        "Cookie":"SC_GU_U=${scGuU};GU_U=${guU}"
       |    },
       |    "queryStringParameters": null,
       |    "pathParameters": ${pathParameters},
       |    "stageVariables": null,
       |    "requestContext": {
       |        "path": "/case${pathSuffix}",
       |        "accountId": "865473395570",
       |        "resourceId": "ls9b61",
       |        "stage": "DEV",
       |        "requestId": "11111111-cbc2-11e7-a389-b7e6e2ab8316",
       |        "identity": null,
       |        "resourcePath": "/case${pathSuffix}",
       |        "httpMethod": "${httpMethod}"
       |    },
       |    "body": "${bodyString}",
       |    "isBase64Encoded": false
       |}
    """.stripMargin

  val createCaseRequest: String = ApiGatewayRequestPayloadBuilder(
    httpMethod = "POST",
    bodyString = "{" +
      s"""\\\"reason\\\":\\\"${Random.alphanumeric.take(10).mkString}\\\",""" +
      "\\\"product\\\":\\\"Membership\\\"," +
      "\\\"subscriptionName\\\":\\\"A-S00045062\\\"" +
      "}"
  )

  def updateCaseRequest(caseId: String, description: String): String = ApiGatewayRequestPayloadBuilder(
    httpMethod = "PATCH",
    bodyString = s"""{\\\"Description\\\":\\\"${description}\\\"}""",
    pathParameters = s"""{"caseId":"${caseId}"}""",
    pathSuffix = "/" + caseId
  )

  def getCaseDetailRequest(caseId: String): String = ApiGatewayRequestPayloadBuilder(
    httpMethod = "GET",
    bodyString = "",
    pathParameters = s"""{"caseId":"${caseId}"}""",
    pathSuffix = "/" + caseId
  )

}
