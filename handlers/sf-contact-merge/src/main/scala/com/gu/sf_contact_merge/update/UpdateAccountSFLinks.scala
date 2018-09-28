package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.ZuoraFieldUpdates
import com.gu.sf_contact_merge.update.UpdateSFContacts.IdentityIdToUse
import com.gu.util.resthttp.RestRequestMaker.{JsonResponse, PutRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object UpdateAccountSFLinks {

  case class WireZuoraAccount(
    crmId: String,
    sfContactId__c: String,
    IdentityId__c: Option[String],
    billToContact: Option[WireZuoraContact]
  )
  case class WireZuoraContact(
    workEmail: String
  )
  implicit val writesC = Json.writes[WireZuoraContact]
  implicit val writesA = Json.writes[WireZuoraAccount]

  case class ZuoraFieldUpdates(
    sfContactId: WinningSFContact,
    crmAccountId: CRMAccountId,
    identityId: Option[IdentityIdToUse],
    refreshEmailWith: Option[EmailAddress]
  )

  case class CRMAccountId(value: String) extends AnyVal

  def apply(put: PutRequest => ClientFailableOp[JsonResponse]): UpdateAccountSFLinks =
    (zuoraFieldUpdates: ZuoraFieldUpdates, accountId: AccountId) =>
      put(toRequest(zuoraFieldUpdates, accountId)).map(_ => ())

  def toRequest(sFPointer: ZuoraFieldUpdates, account: AccountId): PutRequest = {
    val request = WireZuoraAccount(
      sFPointer.crmAccountId.value,
      sFPointer.sfContactId.id.value,
      sFPointer.identityId.map(_.value.value),
      sFPointer.refreshEmailWith.map(e => WireZuoraContact(e.value))
    )
    val path = RelativePath(s"accounts/${account.value}") // TODO danger - we shoudn't go building urls with string concatenation!
    PutRequest(request, path)
  }

}
trait UpdateAccountSFLinks {
  def apply(zuoraFieldUpdates: ZuoraFieldUpdates, accountId: AccountId): ClientFailableOp[Unit]
}
