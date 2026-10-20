package com.gu.autoCancel

import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._

object AutoCancelInputFilter {
  def apply(callout: AutoCancelCallout): ApiGatewayOp[Unit] =
    if (callout.isAutoPay) ContinueProcessing(()) else ReturnWithResponse(noActionRequired("AutoPay is false"))
}
