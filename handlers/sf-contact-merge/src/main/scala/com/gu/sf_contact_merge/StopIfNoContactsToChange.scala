package com.gu.sf_contact_merge

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object StopIfNoContactsToChange {
  def apply[SFContactId](targetId: SFContactId, existingIds: List[SFContactId]): ApiGatewayOp[Unit] = {
    existingIds.distinct match {
      case existingId :: Nil if existingId == targetId =>
        ReturnWithResponse(ApiGatewayResponse.noActionRequired("already merged"))
      case _ => ContinueProcessing(())
    }
  }
}
