package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.SubscriptionsForAccounts.SubscriptionsQueryResponse
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class RelationshipForSubscriptionsTest extends AnyFlatSpec with Matchers {

  val today = LocalDate.of(2018, 5, 23)
  val activeSubResponse = SubscriptionsQueryResponse("id123", "Active", LocalDate.now().plusMonths(4))
  def cancelledSubResponse(date: LocalDate) = SubscriptionsQueryResponse("id123", "Cancelled", date)

  it should "return a 404 if no subscriptions are found" in {
    val subResults = RelationshipForSubscriptions(List())
    val expected = IdentityRetentionApiResponses.canBeDeleted
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship only" in {
    val subResults = RelationshipForSubscriptions(List(activeSubResponse))
    val expected = IdentityRetentionApiResponses.ongoingRelationship
    subResults should be(expected)
  }

  it should "return a 200 if the user has an ongoing relationship, even if they have other cancelled subs" in {
    val subResults = RelationshipForSubscriptions(List(activeSubResponse, cancelledSubResponse(today)))
    val expected = IdentityRetentionApiResponses.ongoingRelationship
    subResults should be(expected)
  }

  it should "return a 200 if the user has cancelled" in {
    val subResults = RelationshipForSubscriptions(List(cancelledSubResponse(today)))
    val expected = IdentityRetentionApiResponses.cancelledRelationship(today)
    subResults should be(expected)
  }

  it should "choose the correct date if they have multiple cancelled subs" in {
    val expectedServiceEndDate = today.plusMonths(11)
    val subResults = RelationshipForSubscriptions(
      List(
        cancelledSubResponse(today.minusMonths(3)),
        cancelledSubResponse(today.plusMonths(1)),
        cancelledSubResponse(expectedServiceEndDate),
      ),
    )
    subResults should be(IdentityRetentionApiResponses.cancelledRelationship(expectedServiceEndDate))
  }

}
