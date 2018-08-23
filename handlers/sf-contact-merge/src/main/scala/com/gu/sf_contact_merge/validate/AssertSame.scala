package com.gu.sf_contact_merge.validate

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

object AssertSame {

  def apply[Element](message: String): AssertSame[Element] = (elements: List[Element]) =>
    if (elements.distinct.size == 1) ContinueProcessing(())
    else ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing $message"))

}

trait AssertSame[Element] {
  def apply(emailAddresses: List[Element]): ApiGatewayOp[Unit]
}
