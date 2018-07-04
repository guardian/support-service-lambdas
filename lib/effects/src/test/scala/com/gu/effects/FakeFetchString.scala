package com.gu.effects

import com.amazonaws.services.s3.model.GetObjectRequest

import scala.util.{Failure, Success, Try}

object FakeFetchString {

  val zuoraRestTestConfig =
    """
       {
       |"stage" : "DEV",
       |"baseUrl": "https://ddd",
       | "username": "e@f.com",
       | "password": "ggg"
       |}
      """.stripMargin

  val identityTestConfig =
    """
       {
        | "stage" : "DEV",
        | "baseUrl": "https://ididbaseurl",
        | "apiToken": "tokentokentokenidentity"
       |}
      """.stripMargin

  val sfTestConfig =
    """
       {
         |"stage" : "DEV",
         |"url": "https://sfurl.haha",
         |"client_id": "clientsfclient",
         |"client_secret": "clientsecretsfsecret",
         |"username": "usernamesf",
         |"password": "passSFpassword",
         |"token": "tokentokenSFtoken"
       }
      """.stripMargin

  val trustedApiconfig =
    """
       {
         |"stage" : "DEV",
         |"apiClientId": "a",
         |"apiToken": "b",
         |"tenantId": "c"
       |}
      """.stripMargin

  val configFiles = Map(
    "membership/support-service-lambdas/DEV/identity-DEV.json" -> identityTestConfig,
    "membership/support-service-lambdas/DEV/sfAuth-DEV.json" -> sfTestConfig,
    "membership/support-service-lambdas/DEV/trustedApi-DEV.json" -> trustedApiconfig,
    "membership/support-service-lambdas/DEV/zuoraRest-DEV.json" -> zuoraRestTestConfig
  )

  def fetchString(r: GetObjectRequest): Try[String] = {
    configFiles.get(r.getKey).map(key => Success(key)).getOrElse(Failure(new RuntimeException(s"test failure unexpected config s3 key ${r.getKey}")))
  }

}
