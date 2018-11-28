package com.gu.identityBackfill

import com.gu.util.apigateway.ApiGatewayResponse.badRequest
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.reader.Types._

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp { error =>
      logger.error(s"Failed to $action: $error")
      badRequest(s"Failed to execute lambda - unable to $action")
    }
  }

}
