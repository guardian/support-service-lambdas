package com.gu.identityBackfill

import com.gu.util.apigateway.ApiGatewayResponse.messageResponse
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.reader.Types._
import com.typesafe.scalalogging.LazyLogging

object TypeConvert extends LazyLogging {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp { error =>
      logger.error(s"Failed to $action: $error")
      messageResponse(
        "500",
        s"Failed to execute lambda - unable to $action, $error",
      )
    }
  }

}
