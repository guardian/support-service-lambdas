package com.gu.effects

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}

object SFTestEffects {

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

  //stubs successful auth when provided with SF credentials provided in com.gu.effects.FakeFetchString
  val authSuccess = (
    POSTRequest(
      "/services/oauth2/token",
      """client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf&
        |password=passSFpasswordtokentokenSFtoken&grant_type=password""".stripMargin
    ),
    HTTPResponse(200, authSuccessResponseBody)
  )
}
