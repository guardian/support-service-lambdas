package com.gu.salesforce.sttp

import cats.effect.IO
import com.gu.salesforce.sttp.SalesforceStub.implicitSalesforceStub
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import io.circe.generic.auto._
import org.scalatest.Inside.inside
import org.scalatest.flatspec
import org.scalatest.matchers.should.Matchers
import sttp.client3.impl.cats.CatsMonadAsyncError
import sttp.client3.testing.SttpBackendStub

import java.time.Instant
import scala.concurrent.ExecutionContext
import scala.io.Source

case class QueryResults(Id: String, CreatedDate: Instant, Name: String)

class SalesforceClientTest extends flatspec.FixtureAnyFlatSpec with Matchers {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  case class FixtureParam(
      config: SFAuthConfig,
      auth: SalesforceAuth,
      backendStub: SttpBackendStub[IO, Nothing],
  )

  def withFixture(test: OneArgTest) = {
    val config = SFAuthConfig(
      "https://salesforceAuthUrl",
      "sfClientId",
      "sfClientSecret",
      "sfUsername",
      "sfPassword",
      "sfToken",
    )
    val auth = SalesforceAuth("salesforce-access-token", "https://salesforceInstanceUrl")
    val backendStub = SttpBackendStub[IO, Nothing](new CatsMonadAsyncError[IO]).stubAuth(config, auth)
    withFixture(
      test.toNoArgTest(
        FixtureParam(
          config,
          auth,
          backendStub,
        ),
      ),
    )
  }

  "SalesforceClient" should "make query request and parse response" in { fixture =>
    val query = "SELECT  Id,  CreatedDate, Name FROM SF_Subscription__c WHERE Name = 'A-S00052409'"
    val backendStub = fixture.backendStub
      .stubQuery(
        fixture.auth,
        query,
        Source.fromResource("subscription-query-response1.json").mkString,
      )
      .stubNextRecordLink(
        fixture.auth,
        "/next-records-link",
        Source.fromResource("subscription-query-response2.json").mkString,
      )

    inside(
      SalesforceClient(backendStub, fixture.config).flatMap(_.query[QueryResults](query)).value.unsafeRunSync(),
    ) { case Right(response) =>
      response.records should equal(
        List(
          QueryResults(
            "000000001",
            Instant.parse(
              "2019-11-18T16:59:24Z",
            ),
            "A-000000001",
          ),
          QueryResults(
            "000000002",
            Instant.parse(
              "2019-11-18T16:59:24Z",
            ),
            "A-000000002",
          ),
        ),
      )
    }
  }

  it should "make patch request" in { fixture =>
    val backendStub = fixture.backendStub.stubPatch(fixture.auth)
    inside {
      SalesforceClient(backendStub, fixture.config)
        .flatMap(
          _.patch(
            "objectName",
            "objectId",
            "{}",
          ),
        )
        .value
        .unsafeRunSync()
    } { case Right(response) =>
      response should equal(())
    }
  }
}
