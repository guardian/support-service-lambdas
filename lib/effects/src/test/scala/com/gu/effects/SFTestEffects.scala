package com.gu.effects

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

object SFTestEffects {

  val salesforceApiVersion = "54.0"

  val authSuccessResponseBody: String =
    s"""
       |{
       |    "access_token": "tokentoken",
       |    "instance_url": "https://instance.url",
       |    "id": "https://id.sf.com/id/idididididid/ididididid",
       |    "token_type": "Bearer",
       |    "issued_at": "101010101010",
       |    "signature": "bW9uc3RlcnMhCg=="
       |}
    """.stripMargin

  // stubs successful auth when provided with SF credentials provided in com.gu.effects.FakeFetchString
  val authSuccess =
    POSTRequest(
      "/services/oauth2/token",
      "client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf" +
        "&password=passSFpasswordtokentokenSFtoken&grant_type=password",
    ) ->
      HTTPResponse(200, authSuccessResponseBody)

  val authFailureResponseBody: String =
    s"""
       |[{
       |  "message": "The users password has expired, you must call SetPassword before attempting any other API operations",
       |  "errorCode": "INVALID_OPERATION_WITH_EXPIRED_PASSWORD"
       | }]
    """.stripMargin

  val authFailure =
    POSTRequest(
      "/services/oauth2/token",
      "client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf" +
        "&password=passSFpasswordtokentokenSFtoken&grant_type=password",
    ) ->
      HTTPResponse(401, authFailureResponseBody)

  def cancelSuccess(referenceId: String, price: Double) =
    POSTRequest(
      s"/services/data/v$salesforceApiVersion/composite/",
      s"""{"allOrNone":true,"compositeRequest":[{"method":"PATCH","url":"/services/data/v$salesforceApiVersion/sobjects/Holiday_Stop_Requests_Detail__c/HSD-1","referenceId":"CANCEL_DETAIL_$referenceId","body":{"Actual_Price__c":$price,"Charge_Code__c":"ManualRefund_Cancellation"}}]}""",
    ) ->
      HTTPResponse(200, """{ "compositeResponse" : [ { "httpStatusCode": 200 } ]}""".stripMargin)

  def withdrawAlreadyCredited(ref: String, withdrawTime: ZonedDateTime) =
    POSTRequest(
      s"/services/data/v$salesforceApiVersion/sobjects/Holiday_Stop_Request__c/$ref",
      s"""{"Withdrawn_Time__c":"${withdrawTime.format(
          DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXXX"),
        )}"}""".stripMargin,
      "PATCH",
    ) ->
      HTTPResponse(
        400,
        """[
        |{
        |    "message": "Holiday Stop Request cannot be withdrawn because some publications have been actioned (credited to customer)",
        |    "errorCode": "FIELD_CUSTOM_VALIDATION_EXCEPTION",
        |    "fields": []
        |}
        |]""".stripMargin,
      )

}
