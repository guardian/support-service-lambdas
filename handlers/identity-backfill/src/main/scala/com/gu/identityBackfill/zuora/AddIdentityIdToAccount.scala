package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types
import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.identityBackfill.zuora.AddIdentityIdToAccount.WireModel.ZuoraAccount
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraReaders.unitReads
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestRequestMaker}
import play.api.libs.json.Json

object AddIdentityIdToAccount {
  object WireModel {

    case class ZuoraAccount(
      IdentityId__c: String
    )
    implicit val zaWrites = Json.writes[ZuoraAccount]

  }

  def reqFromIdentityId(id: Types.IdentityId): ZuoraAccount = {
    ZuoraAccount(id.value)
  }

  def apply(zuoraDeps: ZuoraDeps)(accountId: AccountId, identityId: IdentityId): FailableOp[Unit] = {
    val accounts = ZuoraRestRequestMaker(zuoraDeps).put[ZuoraAccount, Unit](reqFromIdentityId(identityId), s"accounts/${accountId.value}")

    accounts.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
  }

}
