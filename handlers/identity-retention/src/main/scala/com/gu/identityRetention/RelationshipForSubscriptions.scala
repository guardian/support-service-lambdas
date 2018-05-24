package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.SubscriptionsForAccounts.SubscriptionsQueryResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse

object RelationshipForSubscriptions {

  implicit def ordering: Ordering[LocalDate] = Ordering.by(_.toEpochDay)

  def apply(subscriptions: List[SubscriptionsQueryResponse]): ApiResponse = {
    subscriptions match {
      case Nil =>
        IdentityRetentionApiResponses.canBeDeleted
      case subs if (subs.exists(_.Status == "Active")) =>
        IdentityRetentionApiResponses.ongoingRelationship
      case _ =>
        // User only has cancelled subs
        val serviceEndDate = subscriptions.map(_.TermEndDate).max
        IdentityRetentionApiResponses.cancelledRelationship(serviceEndDate)
    }
  }

}
