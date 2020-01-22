package com.gu.holiday_stops

import com.gu.zuora.AccessToken
import com.gu.zuora.subscription.{Subscription, ZuoraAccount}
import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Id, Response}

object ZuoraSttpEffects {
  private val accessToken = "test-zuora-access-token"
  private val zuoraTestBaseUrl = "https://ddd"

  implicit class ZuoraSttpEffectsOps(sttpStub: SttpBackendStub[Id, Nothing]) {
    def stubZuoraAuthCall(): SttpBackendStub[Id, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/oauth/token") =>
          Response.ok(Right(AccessToken(accessToken)))
      }
    }
    def stubZuoraSubscription(subscriptionName: String, subscription: Subscription): SttpBackendStub[Id, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/subscriptions/$subscriptionName") =>
          Response.ok(Right(subscription))
      }
    }
    def stubZuoraAccount(accountKey: String, account: ZuoraAccount): SttpBackendStub[Id, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request if (request.uri.toString() == s"$zuoraTestBaseUrl/accounts/$accountKey") =>
          Response.ok(Right(account))
      }
    }
  }
}
