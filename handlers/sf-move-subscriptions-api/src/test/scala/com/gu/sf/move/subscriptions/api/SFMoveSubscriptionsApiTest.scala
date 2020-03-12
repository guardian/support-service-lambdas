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

  it should "return Success for move subscription request if all downstream calls were successful" in {

    val api = createApp(createZuoraBackendStub(
      oauthResponse = fetchAccessTokenSuccessRes,
      getSubscriptionRes = fetchSubscriptionSuccessRes,
      updateAccountRes = updateAccountSuccessRes
    ))

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2
        )
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.Ok
    getBody[MoveSubscriptionApiSuccess](responseActual) should matchTo(MoveSubscriptionApiSuccess(
      s"Move of Subscription ${moveSubscriptionReq.zuoraSubscriptionId} was successful"
    ))
  }

  it should "return error with message about accessToken fetch failure" in {

    val api = createApp(createZuoraBackendStub(
      oauthResponse = accessTokenUnAuth,
      getSubscriptionRes = fetchSubscriptionFailedRes,
      updateAccountRes = updateAccountSuccessRes
    ))

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2
        )
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) should matchTo(MoveSubscriptionApiError(
      SFMoveSubscriptionsService.fetchZuoraAccessTokenErrorMsg(accessTokenUnAuth.body.left.get)
    ))
  }

  it should "return error status with message about fetch Subscription failure" in {
    val api = createApp(createZuoraBackendStub(
      oauthResponse = fetchAccessTokenSuccessRes,
      getSubscriptionRes = fetchSubscriptionFailedRes,
      updateAccountRes = updateAccountSuccessRes
    ))

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2
        )
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) should matchTo(MoveSubscriptionApiError(
      SFMoveSubscriptionsService.fetchZuoraSubErrorMsg(fetchSubscriptionFailedRes.body.left.get)
    ))
  }

  it should "return error status with message about update Account failure" in {
    val api = createApp(createZuoraBackendStub(
      oauthResponse = fetchAccessTokenSuccessRes,
      getSubscriptionRes = fetchSubscriptionSuccessRes,
      updateAccountRes = updateAccountFailedRes
    ))

    val responseActual = api.run(
      Request[IO](
        method = Method.POST,
        uri = Uri(path = "/subscription/move")
      ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2
        )
    ).value.unsafeRunSync().get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) should matchTo(MoveSubscriptionApiError(
      SFMoveSubscriptionsService.updateZuoraAccountErrorMsg(updateAccountFailedRes.body.left.get)
    ))
  }

  private def createApp(backendStub: SttpBackendStub[Id, Nothing]) = {
    SFMoveSubscriptionsApiApp(DevIdentity("sf-move-subscriptions-api"), backendStub)
      .value.unsafeRunSync()
      .right.get
  }

  private def getBody[A: Decoder](response: org.http4s.Response[IO]) = {
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
