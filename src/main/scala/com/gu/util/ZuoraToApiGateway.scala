package com.gu.util

import com.gu.util.apigateway.ResponseModels.{ ApiResponse, Headers }
import com.gu.util.zuora.internal.ClientFail

object ZuoraToApiGateway {

  def fromClientFail(clientFail: ClientFail): ApiResponse =
    ApiResponse(clientFail.statusCode, new Headers, s"zuora client fail: ${clientFail.message}")

}
