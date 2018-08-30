package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker.{JsonResponse, PutRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads}

object UpdateAccountSFLinks {

  case class Request(
    crmId: String,
    sfContactId__c: String,
    IdentityId__c: Option[String]
  )
  implicit val writes = Json.writes[Request]
  implicit val unitReads: Reads[Unit] = Reads(_ => JsSuccess(()))

  case class LinksFromZuora(
    sfContactId: SFContactId,
    crmAccountId: CRMAccountId,
    identityId: Option[IdentityId]
  )

  case class CRMAccountId(value: String) extends AnyVal

  def apply(put: PutRequest => ClientFailableOp[JsonResponse]): LinksFromZuora => AccountId => ClientFailableOp[Unit] =
    (toRequest _).andThen(_.andThen(put).andThen(_.map(_ => ())))

  def toRequest(sFPointer: LinksFromZuora)(account: AccountId): PutRequest = {
    val request = Request(sFPointer.crmAccountId.value, sFPointer.sfContactId.value, sFPointer.identityId.map(_.value))
    val path = RelativePath(s"accounts/${account.value}") // TODO danger - we shoudn't go building urls with string concatenation!
    PutRequest(request, path)
  }

}
