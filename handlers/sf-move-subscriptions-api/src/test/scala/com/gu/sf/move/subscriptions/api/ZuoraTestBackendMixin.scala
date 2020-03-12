package com.gu.sf.move.subscriptions.api

import java.time.LocalDate

import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.Subscription
import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Id, Response}

trait ZuoraTestBackendMixin {

  private val zuoraTestBaseUrl = "https://test.com"
  private val accessToken = "test-zuora-access-token"
  private val accountNumber = "test-zuora-account-number"

  val moveSubReq = MoveSubscriptionReqBody(
    zuoraSubscriptionId = "test-zuora-sub-id",
    sfAccountId = "test-sf-account-id",
    sfFullContactId = "test-sf-full-contact-id",
  )

  val successAccessToken = Response.ok(Right(AccessToken(accessToken)))

  val sub = mkAnySubscription().copy(
    subscriptionNumber = moveSubReq.zuoraSubscriptionId,
    accountNumber = accountNumber
  )

  val successSubscription = Response.ok(Right(sub))

  val accountUpdateSuccess = Response.ok(Right(s"Move of Subscription ${moveSubReq.zuoraSubscriptionId} was successful"))

  def createZuoraBackendStub(): SttpBackendStub[Id, Nothing] = {
    SttpBackendStub.synchronous
      .whenRequestMatchesPartial {
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token" =>
          successAccessToken
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/${moveSubReq.zuoraSubscriptionId}" =>
          successSubscription
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accountNumber" =>
          accountUpdateSuccess
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
