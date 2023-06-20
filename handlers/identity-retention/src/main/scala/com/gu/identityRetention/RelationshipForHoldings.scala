package com.gu.identityRetention

import com.gu.identityRetention.Types.ProductHolding
import com.gu.util.apigateway.ResponseModels.ApiResponse

import java.time.LocalDate

object RelationshipForHoldings {

  def apply(holdings: List[ProductHolding], today: LocalDate = LocalDate.now()): ApiResponse = {
    holdings match {
      case Nil =>
        IdentityRetentionApiResponses.canBeDeleted
      case subs if (subs.exists(_.ongoingRelationship)) =>
        val serviceEndDate = holdings.map(_.effectiveLapsedDate).max
        IdentityRetentionApiResponses.ongoingRelationship(serviceEndDate, today)
      case _ =>
        // User only has cancelled subs
        val serviceEndDate = holdings.map(_.effectiveLapsedDate).max
        IdentityRetentionApiResponses.lapsedRelationship(serviceEndDate, today)
    }
  }

}
