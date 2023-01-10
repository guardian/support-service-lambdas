package com.gu.cancellation.sf_cases

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceReads.sfAuthConfigReads
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.{CaseId, CaseWithId}
import com.gu.salesforce.{SFAuthConfig, SalesforceClient}
import com.gu.test.EffectsTest
import com.gu.util.config.LoadConfigModule
import com.gu.util.resthttp.JsonHttp
import play.api.libs.json._

import scala.util.Random
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class EndToEndHandlerEffectsTest extends AnyFlatSpec with Matchers {

  import com.gu.cancellation.sf_cases.EndToEndData._
  import com.gu.cancellation.sf_cases.Runner._

  it should "create a case, try to resume that case, update 'Description' field of the case and check the update worked" taggedAs EffectsTest in {

    // create case (which has new case ID in response body)
    val firstRaiseCaseResponse: CaseWithId = getResponse[CaseWithId](
      createCaseRequest,
    )

    // try to raise another case, which should 'resume' that case (i.e. same ID)
    val secondRaiseCaseResponse: CaseWithId = getResponse[CaseWithId](
      createCaseRequest,
    )

    firstRaiseCaseResponse.id shouldEqual secondRaiseCaseResponse.id

    val expectedDescription = "EndToEndTest"

    // update case by setting 'Description' field
    getResponse[JsValue](
      updateCaseRequest(firstRaiseCaseResponse.id.value, expectedDescription),
    )

    // fetch the case to ensure the 'Description' field has been updated
    val caseDescription = for {
      sfConfig <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)(SFAuthConfig.location, sfAuthConfigReads)
      sfClient <- SalesforceClient(RawEffects.response, sfConfig).value.toDisjunction
      getCaseOp = SalesforceCase.GetById[JsValue](sfClient.wrapWith(JsonHttp.get))
      caseResponse <- getCaseOp(CaseId(firstRaiseCaseResponse.id.value)).toDisjunction
    } yield (caseResponse \ "Description").as[String]

    caseDescription shouldEqual Right(expectedDescription)

  }

}

object Runner extends Matchers {

  case class PartialApiResponse(statusCode: String, body: String)

  def getResponse[ResponseType](input: String)(implicit reads: Reads[ResponseType]): ResponseType = {
    val os = new ByteArrayOutputStream()

    Handler.handle(
      inputStream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8)),
      outputStream = os,
      context = null,
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

  private def ApiGatewayRequestPayloadBuilder(
      httpMethod: String,
      bodyString: String,
      pathSuffix: String = "",
      pathParameters: String = "null",
  ): String =
    s"""
       |{
       |    "resource": "/case${pathSuffix}",
       |    "path": "/case${pathSuffix}",
       |    "httpMethod": "${httpMethod}",
       |    "headers": {
       |        "x-identity-id":"100000932"
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
      "\\\"subscriptionName\\\":\\\"A-S00051910\\\"," +
      "\\\"gaData\\\":\\\"{\\\\\\\"UA-51507017-5\\\\\\\":{\\\\\\\"experiments\\\\\\\":" +
      "{\\\\\\\"9ycLuqmFRBGBDGV5bnFlCA\\\\\\\":\\\\\\\"1\\\\\\\"},\\\\\\\"hitcount\\\\\\\":3}\\\"" +
      "}",
  )

  def updateCaseRequest(caseId: String, description: String): String = ApiGatewayRequestPayloadBuilder(
    httpMethod = "PATCH",
    bodyString = s"""{\\\"Description\\\":\\\"${description}\\\"}""",
    pathParameters = s"""{"caseId":"${caseId}"}""",
    pathSuffix = "/" + caseId,
  )

}
