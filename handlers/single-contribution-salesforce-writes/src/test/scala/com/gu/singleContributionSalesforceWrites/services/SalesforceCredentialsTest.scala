package com.gu.singleContributionSalesforceWrites.services

import com.gu.singleContributionSalesforceWrites.services.SalesforceCredentials.SalesforceConnectedApp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceCredentialsTest extends AnyFlatSpec with Matchers {

  "getEndpoint" should "use the CODE Salesforce My Domain" in {
    SalesforceCredentials.getEndpoint("CODE") shouldBe
      "https://gnmtouchpoint--dev1.sandbox.my.salesforce.com/services/oauth2/token"
  }

  it should "use the PROD Salesforce My Domain" in {
    SalesforceCredentials.getEndpoint("PROD") shouldBe
      "https://gnmtouchpoint.my.salesforce.com/services/oauth2/token"
  }

  "getPostForm" should "use the client credentials grant without user credentials" in {
    val connectedApp = SalesforceConnectedApp(
      client_id = "client-id",
      client_secret = "client-secret",
    )

    SalesforceCredentials.getPostForm(connectedApp) shouldBe Seq(
      "grant_type" -> "client_credentials",
      "client_id" -> "client-id",
      "client_secret" -> "client-secret",
    )
  }
}
