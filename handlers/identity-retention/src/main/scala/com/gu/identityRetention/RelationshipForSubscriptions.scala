package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.SubscriptionsForAccounts.SubscriptionsQueryResponse
import com.gu.util.reader.Types.FailableOp
import scalaz.{-\/, \/-}

object RelationshipForSubscriptions {

  implicit def ordering: Ordering[LocalDate] = Ordering.by(_.toEpochDay)

  def apply(subscriptions: List[SubscriptionsQueryResponse]): FailableOp[Unit] = {
    subscriptions match {
      case Nil =>
        -\/(IdentityRetentionApiResponses.notFoundInZuora)
      case subs if (subs.exists(_.Status == "Active")) =>
        -\/(IdentityRetentionApiResponses.ongoingRelationship)
      case _ =>
        // User only has cancelled subs
        val serviceEndDate = subscriptions.map(_.TermEndDate).max
        -\/(IdentityRetentionApiResponses.cancelledRelationship(serviceEndDate))
    }
  }

}
