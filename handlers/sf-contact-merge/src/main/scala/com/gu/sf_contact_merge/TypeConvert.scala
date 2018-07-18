package com.gu.sf_contact_merge

import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp

object TypeConvert {

  implicit class TypeConvertClientOp[A](theEither: ClientFailableOp[A]) {
    def toApiGatewayOp = theEither.toDisjunction.toApiGatewayOp(_)
  }

}
