package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.resthttp.Types.ClientFailableOp

object HealthCheck {

  def apply(getAccount: ZuoraAccountId => ClientFailableOp[GetAccount.Account]): ApiResponse =
    (for {
      account <- getAccount(ZuoraAccountId("2c92a0fb4a38064e014a3f48f1663ad8")).toApiGatewayOp("get test account from zuora")
      isCorrect = account.identityId.contains(IdentityId("13552794"))
    } yield if (isCorrect)
      ApiGatewayResponse.successfulExecution
    else
      ApiGatewayResponse.internalServerError("check identity id in health check")).apiResponse

}
