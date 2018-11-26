package com.gu.batchemailsender.api.batchemail.manualTest

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.batchemailsender.api.batchemail.Handler
import play.api.libs.json.{JsString, Json}

//This is just a way to locally run the emailBatchSender lambda in dev
object EmailBatchSenderManualTest extends App {
  val requestBody =
    """
      |[
      |   {
      |      "payload":{
      |      	 "record_id": "abcd",
      |         "to_address":"leigh-anne.mathieson@theguardian.com",
      |         "subscriber_id":"A-S00044748",
      |         "sf_contact_id":"0036E00000KtDaHQAV",
      |         "product":"Supporter",
      |         "next_charge_date":"2018-09-03",
      |         "last_name":"bla",
      |         "identity_id":"30002177",
      |         "first_name":"something",
      |         "email_stage":"MBv1 - 1"
      |      },
      |      "object_name":"Card_Expiry__c"
      |   }
      |]
    """.stripMargin

  val bodyAsJsString = JsString(requestBody)
  case class ApiRequest(body: String)
  implicit val writes = Json.writes[ApiRequest]
  val requestText = Json.prettyPrint(Json.toJson(ApiRequest(requestBody)))

  println(s"sending request..")
  println(requestText)

  val testInputStream = new ByteArrayInputStream(requestText.getBytes)
  val testOutput = new ByteArrayOutputStream()
  Handler(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
