package com.gu.salesforce.sttp

import java.time.Instant

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import org.scalatest.{FlatSpec, Inside, Matchers}
import com.gu.salesforce.sttp.SalesforceStub._
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.generic.auto._
import SalesforceCirceImplicits._
import scala.io.Source

case class QueryResults(Id: String, CreatedDate: Instant, Name: String)

class SalesforceClientTest extends FlatSpec with Matchers {

  "SalesforceClient" should "make query request and parse response" in {
    val config = SFAuthConfig("https://salesforceAuthUrl", "sfClientId", "sfClientSecret", "sfUsername", "sfPassword", "sfToken")
    val auth = SalesforceAuth("salesforce-access-token", "https://salesforceInstanceUrl")

    val query = "SELECT  Id,  CreatedDate, Name FROM SF_Subscription__c WHERE Name = 'A-S00052409'"
    val backendStub = SttpBackendStub
      .synchronous
      .stubAuth(config, auth)
      .stubQuery(
        auth,
        query,
        Source.fromResource("subscription-query-response1.json").mkString
      )
      .stubNextRecordLink(
        auth,
        "/next-records-link",
        Source.fromResource("subscription-query-response2.json").mkString
      )

    Inside.inside(
      SalesforceClient(backendStub, config).flatMap(_.query[QueryResults](query)).value
    ) {
        case Right(response) =>
          response.records should equal(
            List(
              QueryResults(
                "000000001",
                Instant.parse(
                  "2019-11-18T16:59:24Z",
                ),
                "A-000000001"
              ),
              QueryResults(
                "000000002",
                Instant.parse(
                  "2019-11-18T16:59:24Z",
                ),
                "A-000000002"
              )
            )
          )
      }
  }
}
