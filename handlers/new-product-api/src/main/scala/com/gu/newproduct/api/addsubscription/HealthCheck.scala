package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.AccountIdentitys.HealthCheckTestAccountData
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientFailableOp

object HealthCheck {

  def apply(
      getAccount: ZuoraAccountId => ClientFailableOp[GetAccount.Account],
      accountIdentity: HealthCheckTestAccountData,
  ): ApiResponse =
    (for {
      account <- getAccount(accountIdentity.testZuoraAccountId).toApiGatewayOp("get test account from zuora")
      isCorrect = account.identityId.contains(accountIdentity.expectedIdentityId)
    } yield
      if (isCorrect)
        ApiGatewayResponse.successfulExecution
      else
        ApiGatewayResponse.internalServerError("check identity id in health check")).apiResponse

}

object AccountIdentitys {

  case class HealthCheckTestAccountData(testZuoraAccountId: ZuoraAccountId, expectedIdentityId: IdentityId)

  def accountIdentitys(stage: Stage): HealthCheckTestAccountData =
    stage match {
      case Stage("PROD") =>
        HealthCheckTestAccountData(ZuoraAccountId("2c92a0fb4a38064e014a3f48f1663ad8"), IdentityId("13552794"))
      case Stage("CODE") =>
        HealthCheckTestAccountData(ZuoraAccountId("2c92c0f86140da81016142811d0c6cf7"), IdentityId("30002133"))
      case Stage(_ /*DEV*/ ) =>
        HealthCheckTestAccountData(ZuoraAccountId("8ad095dd82f7aaa50182f96de24d3ddb"), IdentityId("200045767"))
    }

}
