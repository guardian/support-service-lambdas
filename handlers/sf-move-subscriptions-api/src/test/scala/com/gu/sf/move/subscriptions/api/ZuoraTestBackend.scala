package com.gu.sf.move.subscriptions.api

import java.time.LocalDate

import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.Subscription
import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Id, Response}

trait ZuoraTestBackend {

  private val zuoraTestBaseUrl = "https://test.com"
  private val accessToken = "test-zuora-access-token"
  private val accountNumber = "test-zuora-account-number"

  def createZuoraBackendStub(zuoraSubscriptionIdToHandle: String): SttpBackendStub[Id, Nothing] = {
    SttpBackendStub.synchronous
      .whenRequestMatchesPartial {
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token" =>
          Response.ok(Right(AccessToken(accessToken)))
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/$zuoraSubscriptionIdToHandle" =>
          val sub = mkAnySubscription.copy(
            subscriptionNumber = zuoraSubscriptionIdToHandle,
            accountNumber = accountNumber
          )
          Response.ok(Right(sub))
        case request if request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accountNumber" =>
          Response.ok(Right(s"Move of Subscription $zuoraSubscriptionIdToHandle was successful"))
      }
  }

  private val mkAnySubscription = {
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
