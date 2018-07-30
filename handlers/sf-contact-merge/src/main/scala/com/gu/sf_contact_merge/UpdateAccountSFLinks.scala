package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.GetIdentityAndZuoraEmailsForAccounts.{AccountId, SFContactId}
import com.gu.util.resthttp.RestRequestMaker.RequestsPUT
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads}

object UpdateAccountSFLinks {

  case class Request(
    crmId: String,
    sfContactId__c: String
  )
  implicit val writes = Json.writes[Request]
  implicit val unitReads: Reads[Unit] = Reads(_ => JsSuccess(()))

  case class SFPointer(
    sfContactId: SFContactId,
    crmAccountId: CRMAccountId
  )

  case class CRMAccountId(value: String) extends AnyVal

  def apply(zuoraRequests: RequestsPUT)(sFPointer: SFPointer)(account: AccountId): ClientFailableOp[Unit] = {
    val request = Request(sFPointer.crmAccountId.value, sFPointer.sfContactId.value)
    val path = s"accounts/${account.value}" // TODO danger - we shoudn't go building urls with string concatenation!
    zuoraRequests.put[Request, Unit](request, path)
  }

}
