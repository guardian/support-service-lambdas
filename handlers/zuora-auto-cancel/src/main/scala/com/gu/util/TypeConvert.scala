package com.gu.util

import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure}

object TypeConvert {

  implicit class TypeConvertClientOp[A](clientOp: ClientFailableOp[A]) {
    def toApiGatewayOp(action: String): ApiGatewayOp[A] = clientOp.toDisjunction.toApiGatewayOp(action)

    def toApiGatewayOp(failureToApiResponse: ClientFailure => ApiResponse): ApiGatewayOp[A] =
      clientOp.toDisjunction.toApiGatewayOp(failureToApiResponse)

    def withAmendedError(amendError: ClientFailure => ClientFailure) =
      clientOp.toDisjunction.left.map(amendError(_)).toClientFailableOp
  }

}
