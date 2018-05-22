package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.SubscriptionsForAccounts.SubscriptionsQueryResponse
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class RelationshipForSubscriptionsTest extends FlatSpec with Matchers {

  val activeSubResponse = SubscriptionsQueryResponse("id123", "Active", LocalDate.now().plusMonths(4))
  def cancelledSubResponse(date: LocalDate) = SubscriptionsQueryResponse("id123", "Cancelled", date)

  it should "return a 404 if no subscriptions are found" in {
    val subResults = RelationshipForSubscriptions.apply(List())
    val expected = -\/(IdentityRetentionApiResponses.notFoundInZuora)
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship only" in {
    val subResults = RelationshipForSubscriptions.apply(List(activeSubResponse))
    val expected = -\/(IdentityRetentionApiResponses.ongoingRelationship)
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship, even if they have other cancelled subs" in {
    val subResults = RelationshipForSubscriptions.apply(List(activeSubResponse, cancelledSubResponse(LocalDate.now.minusMonths(3))))
    val expected = -\/(IdentityRetentionApiResponses.ongoingRelationship)
    subResults should be(expected)
  }

  it should "return a 200 if the user has cancelled" in {
    val subResults = RelationshipForSubscriptions.apply(List(cancelledSubResponse(LocalDate.now.minusMonths(3))))
    val expected = -\/(IdentityRetentionApiResponses.cancelledRelationship(LocalDate.now().minusMonths(3)))
    subResults should be(expected)
  }

  it should "choose the correct date if they have multiple cancelled subs" in {
    val expectedServiceEndDate = LocalDate.now.plusMonths(11)
    val subResults = RelationshipForSubscriptions.apply(List(
      cancelledSubResponse(LocalDate.now.minusMonths(3)),
      cancelledSubResponse(LocalDate.now.plusMonths(1)),
      cancelledSubResponse(expectedServiceEndDate)
    ))
    subResults should be(-\/(IdentityRetentionApiResponses.cancelledRelationship(expectedServiceEndDate)))
  }

}
