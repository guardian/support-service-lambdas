package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.AccountIdentitys.AccountIdentity
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
    accountIdentity: AccountIdentity
  ): ApiResponse =
    (for {
      account <- getAccount(accountIdentity.zuoraAccountId).toApiGatewayOp("get test account from zuora")
      isCorrect = account.identityId.contains(accountIdentity.identityId)
    } yield if (isCorrect)
      ApiGatewayResponse.successfulExecution
    else
      ApiGatewayResponse.internalServerError("check identity id in health check")).apiResponse

}

object AccountIdentitys {

  case class AccountIdentity(zuoraAccountId: ZuoraAccountId, identityId: IdentityId)

  def accountIdentitys(stage: Stage): AccountIdentity =
    stage match {
      case Stage("PROD") => AccountIdentity(ZuoraAccountId("2c92a0fb4a38064e014a3f48f1663ad8"), IdentityId("13552794"))
      case Stage("CODE") => AccountIdentity(ZuoraAccountId("2c92c0f86140da81016142811d0c6cf7"), IdentityId("30002133"))
      case Stage(_ /*DEV*/ ) => AccountIdentity(ZuoraAccountId("2c92c0f8646e0a6601646ff9b98e7b5f"), IdentityId("1234567890"))
    }

}
