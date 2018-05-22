package com.gu.identityRetention

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}

object ZuoraQueryMocks {

  val activeResult = """
                       |{
                       |  "Id": "acc321",
                       |  "Status": "Active"
                       |}
                       |"""

  val cancelledResult = """
                          |{
                          |  "Id": "acc321",
                          |  "Status": "Cancelled"
                          |}
                          |"""

  def postResponse(zuoraAccounts: List[String]): Map[POSTRequest, HTTPResponse] = {

    val accountQueryResponse: String =
      s"""
         |{
         |    "records": [${zuoraAccounts.mkString(",")}],
         |    "size": ${zuoraAccounts.size},
         |    "done": true
         |}
    """.stripMargin

    Map(
      POSTRequest("/action/query", """{"queryString":"select id, status from account where IdentityId__c = '321'"}""") -> HTTPResponse(200, accountQueryResponse)
    )
  }

  val failedPOST = Map(
    POSTRequest("/action/query", """{"queryString":"select id, status from account where IdentityId__c = '321'"}""") -> HTTPResponse(500, """{ error: Internal server error }""")
  )

}
