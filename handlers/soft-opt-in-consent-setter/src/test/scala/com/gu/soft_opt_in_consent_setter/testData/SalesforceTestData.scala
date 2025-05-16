package com.gu.soft_opt_in_consent_setter.testData

import com.gu.salesforce.SalesforceAuth
import com.gu.soft_opt_in_consent_setter.models.SFSubRecordResponse
import scalaj.http.HttpResponse

object SalesforceTestData {

  val thrownResponse: Either[Throwable, HttpResponse[String]] = Left(new Throwable())
  val failedResponse: Either[Throwable, HttpResponse[String]] = Right(
    HttpResponse("unexpected body", 200, Map.empty[String, IndexedSeq[String]]),
  )

  val accessToken = "access_token"
  val instanceUrl = "url.com"
  val validAuthResponse =
    s"""{
       | "access_token": "$accessToken",
       | "instance_url": "$instanceUrl"
       |}""".stripMargin
  val authDetails: SalesforceAuth = SalesforceAuth(accessToken, instanceUrl)
  val successfulAuthResponse: Either[Throwable, HttpResponse[String]] = Right(
    HttpResponse(validAuthResponse, 200, Map.empty[String, IndexedSeq[String]]),
  )

  val validSubsToProcessResponse =
    s"""{
       | "totalSize": 0,
       | "done": true,
       | "records": []
       |}""".stripMargin
  val subsToProcess = SFSubRecordResponse(0, true, Seq())
  val successfulQueryResponse: Either[Throwable, HttpResponse[String]] = Right(
    HttpResponse(validSubsToProcessResponse, 200, Map.empty[String, IndexedSeq[String]]),
  )

  val validCompositeUpdateResponse =
    s"""[{
       | "id" : "something",
       | "success" : true,
       | "errors" : [ ]
   }]""".stripMargin
  val successfulCompositeUpdateResponse: Either[Throwable, HttpResponse[String]] = Right(
    HttpResponse(validCompositeUpdateResponse, 200, Map.empty[String, IndexedSeq[String]]),
  )

}
