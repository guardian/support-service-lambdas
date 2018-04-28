package com.gu.identityBackfill

import com.gu.identity.GetByEmail
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import scalaz.\/

object ResponseMaker {

  implicit class HttpApiGatewayOps[SUCCESS](clientFailableOp: ClientFailableOp[SUCCESS]) {
    def nonSuccessToError: FailableOp[SUCCESS] =
      clientFailableOp.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
  }

  implicit class ApiErrorApiGatewayOps[SUCCESS](clientFailableOp: \/[GetByEmail.ApiError, SUCCESS]) {
    def nonSuccessToError: FailableOp[SUCCESS] =
      clientFailableOp.leftMap(e => ApiGatewayResponse.internalServerError(e.toString))
  }

}
