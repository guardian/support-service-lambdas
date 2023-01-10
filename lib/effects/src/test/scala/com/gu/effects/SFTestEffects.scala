package com.gu.effects

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}

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
  val authSuccess = (
    POSTRequest(
      "/services/oauth2/token",
      "client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf" +
        "&password=passSFpasswordtokentokenSFtoken&grant_type=password",
    ),
    HTTPResponse(200, authSuccessResponseBody),
  )

  def cancelSuccess(referenceId: String, price: Double) = (
    POSTRequest(
      s"/services/data/v$salesforceApiVersion/composite/",
      s"""{"allOrNone":true,"compositeRequest":[{"method":"PATCH","url":"/services/data/v$salesforceApiVersion/sobjects/Holiday_Stop_Requests_Detail__c/HSD-1","referenceId":"CANCEL_DETAIL_$referenceId","body":{"Actual_Price__c":$price,"Charge_Code__c":"ManualRefund_Cancellation"}}]}""",
    ),
    HTTPResponse(200, """{ "compositeResponse" : [ { "httpStatusCode": 200 } ]}""".stripMargin),
  )
}
