package com.gu.sf_contact_merge.getaccounts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.ContactId
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.OrTraverse
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import cats.data.NonEmptyList

object GetContacts {

  case class IdentityAndSFContact(identityId: Option[IdentityId], sfContactId: SFContactId)

  case class AccountId(value: String) extends AnyVal

  case class WireAccount(BillToId: String, IdentityId__c: Option[String], sfContactId__c: String)
  implicit val readWireAccount = Json.reads[WireAccount]

  def apply(
      zuoraQuerier: ZuoraQuerier,
      accountIds: NonEmptyList[AccountId],
  ): ClientFailableOp[Map[ContactId, IdentityAndSFContact]] =
    for {
      or <- OrTraverse(accountIds) { accountId =>
        zoql"""Id = ${accountId.value}"""
      }
      query <- zoql"SELECT BillToId, IdentityId__c, sfContactId__c FROM Account WHERE $or"
      result <- zuoraQuerier[WireAccount](query)
      _ <- if (result.done) ClientSuccess(()) else GenericError("oops, query was too big for one page")
    } yield result.records.map { acc =>
      (
        ContactId(acc.BillToId),
        IdentityAndSFContact(
          acc.IdentityId__c.map(IdentityId.apply),
          SFContactId(acc.sfContactId__c),
        ),
      )
    }.toMap

}
