package com.gu.stripeCustomerSourceUpdated

import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp(action)
  }

}
