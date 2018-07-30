package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.update.GetIdentityIdForAccount.WireModel.ZuoraAccount
import com.gu.sf_contact_merge.validation.GetContacts.AccountId
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetIdentityIdForAccount {
  object WireModel {

    case class BasicInfo(
      IdentityId__c: Option[String]
    )

    case class ZuoraAccount(
      basicInfo: BasicInfo
    )
    implicit val zaReadsBasicInfo = Json.reads[BasicInfo]
    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

  }

  def apply(requests: Requests)(accountId: AccountId): ClientFailableOp[Option[String]] =
    requests.get[ZuoraAccount](s"/accounts/${accountId.value}").map(_.basicInfo.IdentityId__c)

}
