package com.gu.sf.move.subscriptions.api


import java.time.LocalDate

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.Subscription
import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Id, Response}
import io.circe.generic.auto._
import io.circe.syntax._
import org.http4s.{Method, Request, Status, Uri}
import org.scalatest.{FlatSpec, Matchers}


class SFMoveSubscriptionsApiTest extends FlatSpec with Matchers {

  private val zuoraTestBaseUrl = "https://test.com"
  private val accessToken = "test-zuora-access-token"
  private val moveSubReq = MoveSubscriptionReqBody(
    zuoraSubscriptionId = "A-1111",
    sfAccountId = "2222",
    sfFullContactId = "3333",
  )

  private val accNumber = "xyz"

  private val zuoraBackendStub: SttpBackendStub[Id, Nothing] = SttpBackendStub.synchronous
    .whenRequestMatchesPartial {
      case request if request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token" =>
        Response.ok(Right(AccessToken(accessToken)))
      case request if request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/${moveSubReq.zuoraSubscriptionId}" =>
        val sub = mkAnySubscription.copy(
          subscriptionNumber = moveSubReq.zuoraSubscriptionId,
          accountNumber = accNumber
        )
        Response.ok(Right(sub))
      case request if request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accNumber" =>
        Response.ok(Right("woooow"))
    }

  private val api = createApp(zuoraBackendStub)

  it should "return OK status for move subscription request" in {

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
        moveSubReq.asJson.spaces2)
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.Ok
  }

  private def createApp(backendStub: SttpBackendStub[Id, Nothing]) = {
    SFMoveSubscriptionsApiApp(DevIdentity("sf-move-subscriptions-api"), backendStub).value.unsafeRunSync()
      .right.get
  }

  private val mkAnySubscription = {
    Subscription(
      status = "Active",
      subscriptionNumber = "S1",
      termStartDate = LocalDate.of(2019, 3, 1),
      termEndDate = LocalDate.of(2020, 3, 1),
      customerAcceptanceDate = LocalDate.of(2020, 4, 1),
      contractEffectiveDate = LocalDate.of(2020, 4, 1),
      currentTerm = 12,
      currentTermPeriodType = "Month",
      ratePlans = Nil,
      accountNumber = "",
      autoRenew = false
    )
  }


}
