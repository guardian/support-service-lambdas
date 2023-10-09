package com.gu.sf.move.subscriptions.api

import cats.effect.IO
import com.gu.DevIdentity
import com.gu.zuora.MoveSubscriptionAtZuoraAccountResponse
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffShouldMatcher
import sttp.client3.Identity
import sttp.client3.testing.SttpBackendStub
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._
import org.http4s._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SFMoveSubscriptionsApiTest extends AnyFlatSpec with should.Matchers with DiffShouldMatcher with ZuoraTestBackendMixin {

  it should "return SUCCESS for move subscription request if all downstream calls were successful" in {

    val api = createApp(
      createZuoraBackendStub(
        oauthResponse = fetchAccessTokenSuccessRes,
        getSubscriptionRes = fetchSubscriptionSuccessRes,
        updateAccountRes = updateAccountSuccessRes,
      ),
    )

    val responseActual = api
      .run(
        Request[IO](
          method = Method.POST,
          uri = Uri(path = "/subscription/move"),
        ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    responseActual.status shouldEqual Status.Ok
    getBody[MoveSubscriptionApiSuccess](responseActual) shouldMatchTo(
      MoveSubscriptionApiSuccess(
        MoveSubscriptionAtZuoraAccountResponse("SUCCESS").toString,
      ),
    )
  }

  it should "return error with message about accessToken fetch failure" in {

    val api = createApp(
      createZuoraBackendStub(
        oauthResponse = accessTokenUnAuthError,
        getSubscriptionRes = fetchSubscriptionFailedRes,
        updateAccountRes = updateAccountSuccessRes,
      ),
    )

    val responseActual = api
      .run(
        Request[IO](
          method = Method.POST,
          uri = Uri(path = "/subscription/move"),
        ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) shouldMatchTo(
      MoveSubscriptionApiError(
        FetchZuoraAccessTokenError(
          accessTokenUnAuthError.body.swap.map(_.reason).getOrElse(throw new RuntimeException),
        ).toString,
      ),
    )
  }

  it should "return error status with message about fetch Subscription failure" in {
    val api = createApp(
      createZuoraBackendStub(
        oauthResponse = fetchAccessTokenSuccessRes,
        getSubscriptionRes = fetchSubscriptionFailedRes,
        updateAccountRes = updateAccountSuccessRes,
      ),
    )

    val responseActual = api
      .run(
        Request[IO](
          method = Method.POST,
          uri = Uri(path = "/subscription/move"),
        ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) shouldMatchTo(
      MoveSubscriptionApiError(
        FetchZuoraSubscriptionError(
          fetchSubscriptionFailedRes.body.swap.map(_.reason).getOrElse(throw new RuntimeException),
        ).toString,
      ),
    )
  }

  it should "return error status with message about update Account failure" in {
    val api = createApp(
      createZuoraBackendStub(
        oauthResponse = fetchAccessTokenSuccessRes,
        getSubscriptionRes = fetchSubscriptionSuccessRes,
        updateAccountRes = updateAccountFailedRes,
      ),
    )

    val responseActual = api
      .run(
        Request[IO](
          method = Method.POST,
          uri = Uri(path = "/subscription/move"),
        ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    responseActual.status shouldEqual Status.InternalServerError
    getBody[MoveSubscriptionApiError](responseActual) shouldMatchTo(
      MoveSubscriptionApiError(
        UpdateZuoraAccountError(
          updateAccountFailedRes.body.swap.map(_.reason).getOrElse(throw new RuntimeException),
        ).toString,
      ),
    )
  }

  it should "return SUCCESS_DRY_RUN for move subscription dryRun request if all downstream calls were successful" in {

    val api = createApp(
      createZuoraBackendStub(
        oauthResponse = fetchAccessTokenSuccessRes,
        getSubscriptionRes = fetchSubscriptionSuccessRes,
        updateAccountRes = updateAccountSuccessRes,
      ),
    )

    val responseActual = api
      .run(
        Request[IO](
          method = Method.POST,
          uri = Uri(path = "/subscription/move/dry-run"),
        ).withEntity[String](
          moveSubscriptionReq.asJson.spaces2,
        ),
      )
      .value
      .unsafeRunSync()
      .get

    responseActual.status shouldEqual Status.Ok
    getBody[MoveSubscriptionApiSuccess](responseActual) shouldMatchTo(
      MoveSubscriptionApiSuccess(
        MoveSubscriptionAtZuoraAccountResponse("SUCCESS_DRY_RUN").toString,
      ),
    )
  }

  private def createApp(backendStub: SttpBackendStub[Identity, Any]) = {
    SFMoveSubscriptionsApiApp(
      DevIdentity("sf-move-subscriptions-api"),
      backendStub,
      new UpdateSupporterProductDataStub(),
    ).value
      .unsafeRunSync()
      .getOrElse(throw new RuntimeException)
  }

  private def getBody[A: Decoder](response: org.http4s.Response[IO]) = {
    val bodyString = response.bodyText.compile.toList
      .unsafeRunSync()
      .mkString("")

    decode[A](bodyString)
      .fold(
        error => fail(s"Failed to decode response body $bodyString: $error"),
        identity,
      )
  }
}
