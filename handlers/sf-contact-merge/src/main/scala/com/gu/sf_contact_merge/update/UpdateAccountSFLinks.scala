package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
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

  case class LinksFromZuora(
    sfContactId: SFContactId,
    crmAccountId: CRMAccountId,
    identityId: Option[IdentityId],
    maybeEmail: Option[EmailAddress]
  )

  case class CRMAccountId(value: String) extends AnyVal

  def apply(put: PutRequest => ClientFailableOp[JsonResponse]): LinksFromZuora => AccountId => ClientFailableOp[Unit] =
    (toRequest _).andThen(_.andThen(put).andThen(_.map(_ => ())))

  def toRequest(sFPointer: LinksFromZuora)(account: AccountId): PutRequest = {
    val request = WireZuoraAccount(
      sFPointer.crmAccountId.value,
      sFPointer.sfContactId.value,
      sFPointer.identityId.map(_.value),
      sFPointer.maybeEmail.map(e => WireZuoraContact(e.value))
    )
    val path = RelativePath(s"accounts/${account.value}") // TODO danger - we shoudn't go building urls with string concatenation!
    PutRequest(request, path)
  }

}
