package com.gu.newproduct.api.addsubscription.validation

import com.gu.util.reader.Types._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp

trait Validation {
  def errorResponse(msg: String) = ApiGatewayResponse.messageResponse("422", msg)
  def check(condition: Boolean, ifFalseReturn: String): ApiGatewayOp[Unit] = condition.toApiGatewayContinueProcessing(errorResponse(ifFalseReturn))
  def extract[V](option: Option[V], ifNoneReturn: String): ApiGatewayOp[V] = option.toApiGatewayContinueProcessing(errorResponse(ifNoneReturn))
}
