package com.gu.identityBackfill.zuora.addIdentityId

import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.identityBackfill.zuora.addIdentityId.GetIdentityIdForAccount.WireModel.ZuoraAccount
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.Requests
import play.api.libs.json.Json

object GetIdentityIdForAccount {
  object WireModel {

    case class BasicInfo(
      IdentityId__c: String
    )

    case class ZuoraAccount(
      basicInfo: BasicInfo
    )
    implicit val zaReadsBasicInfo = Json.reads[BasicInfo]
    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

  }

  def apply(requests: Requests)(accountId: AccountId): FailableOp[IdentityId] = {
    val accounts = for {
      account <- requests.get[ZuoraAccount](s"/accounts/${accountId.value}")
    } yield IdentityId(account.basicInfo.IdentityId__c)

    accounts.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
  }

}
