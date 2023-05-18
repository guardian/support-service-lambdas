package com.gu.identityRetention

import com.gu.identityRetention.Types.ProductHolding
import com.gu.util.apigateway.ResponseModels.ApiResponse

object RelationshipForHoldings {

  def apply(holdings: List[ProductHolding]): ApiResponse = {
    holdings match {
      case Nil =>
        IdentityRetentionApiResponses.canBeDeleted
      case subs if (subs.exists(_.status == "Active")) =>
        IdentityRetentionApiResponses.ongoingRelationship
      case _ =>
        // User only has cancelled subs
        val serviceEndDate = holdings.map(_.effectiveLapsedDate).max
        IdentityRetentionApiResponses.cancelledRelationship(serviceEndDate)
    }
  }

}
