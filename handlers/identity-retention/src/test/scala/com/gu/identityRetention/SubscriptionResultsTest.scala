package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.QueryZuoraSubscriptions.SubscriptionsQueryResponse
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class SubscriptionResultsTest extends FlatSpec with Matchers {

  val activeSubResponse = SubscriptionsQueryResponse("id123", "Active", "A-S123", LocalDate.now().plusMonths(4))
  val cancelledSubResponse = SubscriptionsQueryResponse("id123", "Cancelled", "A-S123", LocalDate.now().plusMonths(5))

  it should "return a 404 if no subscriptions are found" in {
    val subResults = SubscriptionResults.apply(List())
    val expected = -\/(IdentityRetentionApiResponses.notFoundInZuora)
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship only" in {
    val subResults = SubscriptionResults.apply(List(activeSubResponse))
    val expected = -\/(IdentityRetentionApiResponses.ongoingRelationship)
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship, even if they have other cancelled subs" in {
    val subResults = SubscriptionResults.apply(List(activeSubResponse, cancelledSubResponse))
    val expected = -\/(IdentityRetentionApiResponses.ongoingRelationship)
    subResults should be(expected)
  }

  it should "return a 200 if the user has cancelled" in {
    val subResults = SubscriptionResults.apply(List(cancelledSubResponse))
    val expected = -\/(IdentityRetentionApiResponses.cancelledRelationship(LocalDate.now().plusMonths(5)))
    subResults should be(expected)
  }

}
