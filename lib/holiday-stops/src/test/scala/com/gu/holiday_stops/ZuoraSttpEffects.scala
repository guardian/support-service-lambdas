package com.gu.holiday_stops

import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.{Subscription, ZuoraAccount}
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Identity, Response}

object ZuoraSttpEffects {
  private val accessToken = "test-zuora-access-token"
  private val zuoraTestBaseUrl = "https://ddd"

  implicit class ZuoraSttpEffectsOps(sttpStub: SttpBackendStub[Identity, Any]) {
    def stubZuoraAuthCall(): SttpBackendStub[Identity, Any] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token") =>
          Response.ok(Right(AccessToken(accessToken)))
      }
    }

    def stubZuoraSubscription(subscriptionName: String, subscription: Subscription): SttpBackendStub[Identity, Any] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/$subscriptionName") =>
          Response.ok(Right(subscription))
      }
    }

    def stubZuoraAccount(accountKey: String, account: ZuoraAccount): SttpBackendStub[Identity, Any] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accountKey") =>
          Response.ok(Right(account))
      }
    }
  }
}
