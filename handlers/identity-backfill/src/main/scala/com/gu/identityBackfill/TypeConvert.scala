package com.gu.identityBackfill

import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.reader.Types._

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp(action)
  }

}
