package com.gu.sf.move.subscriptions.api

import java.time.LocalDate

import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.Subscription
import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Id, Response, StatusCodes}

trait ZuoraTestBackendMixin {

  private val zuoraTestBaseUrl = "https://test.com"
  private val accessToken = "test-zuora-access-token"
  private val accountNumber = "test-zuora-account-number"

  protected val moveSubscriptionReq = MoveSubscriptionReqBody(
    zuoraSubscriptionId = "test-zuora-sub-id",
    sfAccountId = "test-sf-account-id",
    sfFullContactId = "test-sf-full-contact-id",
  )

  private val sub = mkAnySubscription().copy(
    subscriptionNumber = moveSubscriptionReq.zuoraSubscriptionId,
    accountNumber = accountNumber
  )

  protected val successAccessTokenRes: Response[Either[Nothing, AccessToken]] =
    Response.ok(Right(AccessToken(accessToken)))


  protected val accessTokenUnAuth: Response[Either[Nothing, AccessToken]] =
    Response.error("Unable to generate token", StatusCodes.Unauthorized)

  protected val successSubscriptionRes: Response[Either[Nothing, Subscription]] =
    Response.ok(Right(sub))

  protected val accountUpdateSuccessRes: Response[Either[Nothing, String]] =
    Response.ok(Right(s"Move of Subscription ${moveSubscriptionReq.zuoraSubscriptionId} was successful"))

  def createZuoraBackendStub[T](
                                 oauthResponse: Response[Either[Nothing, AccessToken]],
                                 getSubscriptionRes: Response[Either[Nothing, Subscription]],
                                 updateAccountRes: Response[Either[Nothing, String]]
                               ): SttpBackendStub[Id, Nothing] = {
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
