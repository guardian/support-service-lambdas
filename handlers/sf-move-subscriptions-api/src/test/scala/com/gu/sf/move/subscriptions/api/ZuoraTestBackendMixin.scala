package com.gu.sf.move.subscriptions.api

import com.gu.zuora.subscription.{Subscription, ZuoraApiFailure}
import com.gu.zuora.{AccessToken, MoveSubscriptionAtZuoraAccountResponse}
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Identity, Response}
import sttp.model.StatusCode

import java.time.LocalDate

trait ZuoraTestBackendMixin {

  private val zuoraTestBaseUrl = "https://test.com"
  private val accessToken = "test-zuora-access-token"
  private val accountNumber = "test-zuora-account-number"

  protected val moveSubscriptionReq: MoveSubscriptionReqBody = MoveSubscriptionReqBody(
    zuoraSubscriptionId = "test-zuora-sub-id",
    sfAccountId = "test-sf-account-id",
    sfFullContactId = "test-sf-full-contact-id",
    identityId = "test-guardian-identity-id"
  )

  private val sub = mkAnySubscription().copy(
    subscriptionNumber = moveSubscriptionReq.zuoraSubscriptionId,
    accountNumber = accountNumber
  )

  protected val fetchAccessTokenSuccessRes: Response[Either[ZuoraApiFailure, AccessToken]] =
    Response.ok(Right(AccessToken(accessToken)))

  protected val fetchSubscriptionSuccessRes: Response[Either[ZuoraApiFailure, Subscription]] =
    Response.ok(Right(sub))

  protected val updateAccountSuccessRes: Response[Either[ZuoraApiFailure, MoveSubscriptionAtZuoraAccountResponse]] =
    Response.ok(Right(MoveSubscriptionAtZuoraAccountResponse("SUCCESS")))

  protected val accessTokenUnAuthError: Response[Either[ZuoraApiFailure, AccessToken]] =
    Response(Left(ZuoraApiFailure("Unable to generate token")), StatusCode.Unauthorized)

  protected val fetchSubscriptionFailedRes: Response[Either[ZuoraApiFailure, Subscription]] =
    Response(Left(ZuoraApiFailure("get Subscription failure")), StatusCode.InternalServerError)

  protected val updateAccountFailedRes: Response[Either[ZuoraApiFailure, MoveSubscriptionAtZuoraAccountResponse]] =
    Response(Left(ZuoraApiFailure("update ZuoraAccount failure")), StatusCode.InternalServerError)

  def createZuoraBackendStub(
    oauthResponse: Response[Either[ZuoraApiFailure, AccessToken]],
    getSubscriptionRes: Response[Either[ZuoraApiFailure, Subscription]],
    updateAccountRes: Response[Either[ZuoraApiFailure, MoveSubscriptionAtZuoraAccountResponse]]
  ): SttpBackendStub[Identity, Any] = {
    SttpBackendStub.synchronous
      .whenRequestMatchesPartial {
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token" =>
          oauthResponse
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/${moveSubscriptionReq.zuoraSubscriptionId}" =>
          getSubscriptionRes
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accountNumber" =>
          updateAccountRes
      }
  }

  private def mkAnySubscription(): Subscription = {
    val now = LocalDate.now()
    Subscription(
      status = "Active",
      subscriptionNumber = "S1",
      termStartDate = now,
      termEndDate = now,
      customerAcceptanceDate = now,
      contractEffectiveDate = now,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      ratePlans = Nil,
      accountNumber = "",
      autoRenew = false
    )
  }

}
