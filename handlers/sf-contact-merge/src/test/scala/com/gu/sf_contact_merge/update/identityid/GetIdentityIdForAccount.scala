package com.gu.sf_contact_merge.update.identityid

import com.gu.sf_contact_merge.update.identityid.GetIdentityIdForAccount.WireModel.{BasicInfo, ZuoraAccount}
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetIdentityIdForAccount {
  object WireModel {

    case class BasicInfo(
      sfContactId__c: String,
      crmId: String,
      IdentityId__c: Option[String]
    )

    case class ZuoraAccount(
      basicInfo: BasicInfo
    )
    implicit val zaReadsBasicInfo = Json.reads[BasicInfo]
    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

  }

  def apply(requests: Requests)(accountId: AccountId): ClientFailableOp[BasicInfo] =
    requests.get[ZuoraAccount](s"/accounts/${accountId.value}").map(_.basicInfo)

}
