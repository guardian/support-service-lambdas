package com.gu.sf_contact_merge.validate

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object AssertSame {

  def apply[EmailAddress]: AssertSame[EmailAddress] = (emailAddresses: List[EmailAddress]) =>
    if (emailAddresses.distinct.size == 1) ContinueProcessing(())
    else ReturnWithResponse(ApiGatewayResponse.notFound("those zuora accounts had differing emails"))

}

trait AssertSame[EmailAddress] {
  def apply(emailAddresses: List[EmailAddress]): ApiGatewayOp[Unit]
}
