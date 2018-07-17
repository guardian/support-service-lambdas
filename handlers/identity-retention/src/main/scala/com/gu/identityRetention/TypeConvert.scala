package com.gu.identityRetention

import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp

object TypeConvert {

  implicit class TypeConvertClientOp[A](theEither: ClientFailableOp[A]) {
    def toApiGatewayOp = theEither.toDisjunction.toApiGatewayOp(_)
  }

}
