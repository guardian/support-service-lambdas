package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import com.gu.DevIdentity
import com.softwaremill.diffx.scalatest.DiffMatcher
import com.softwaremill.sttp.Id
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._
import org.http4s.{Method, Request, Response, Status, Uri}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SFMoveSubscriptionsApiTest extends AnyFlatSpec with should.Matchers with DiffMatcher with ZuoraTestBackendMixin {

  it should "return OK status for move subscription request" in {

    val moveSubReq = MoveSubscriptionReqBody(
      zuoraSubscriptionId = "test-zuora-sub-id",
      sfAccountId = "test-sf-account-id",
      sfFullContactId = "test-sf-full-contact-id",
    )

    val api = createApp(createZuoraBackendStub(zuoraSubscriptionIdToHandle = moveSubReq.zuoraSubscriptionId))

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
        moveSubReq.asJson.spaces2)
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.Ok
    getBody[MoveSubscriptionApiSuccess](responseActual) should matchTo(MoveSubscriptionApiSuccess(
      s"Move of Subscription ${moveSubReq.zuoraSubscriptionId} was successful"))
  }

  private def createApp(backendStub: SttpBackendStub[Id, Nothing]) = {
    SFMoveSubscriptionsApiApp(DevIdentity("sf-move-subscriptions-api"), backendStub)
      .value.unsafeRunSync()
      .right.get
  }

  private def getBody[A: Decoder](response: Response[IO]) = {
    val bodyString = response
      .bodyAsText()
      .compile
      .toList
      .unsafeRunSync()
      .mkString("")

    decode[A](bodyString)
      .fold(
        error => fail(s"Failed to decode response body $bodyString: $error"),
        identity
      )
  }
}