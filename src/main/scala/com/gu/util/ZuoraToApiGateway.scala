package com.gu.util

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.internal.ClientFail

object ZuoraToApiGateway {

  def fromClientFail(clientFail: ClientFail): ApiResponse =
    ApiGatewayResponse.internalServerError(s"zuora client fail: ${clientFail.message}")

}
