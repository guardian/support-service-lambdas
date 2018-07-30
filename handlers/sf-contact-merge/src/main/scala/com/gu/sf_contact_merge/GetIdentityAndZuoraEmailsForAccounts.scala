package com.gu.sf_contact_merge

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.{MaybeNonEmptyList, OrTraverse}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.NonEmptyList

object GetIdentityAndZuoraEmailsForAccounts {

  case class AccountId(value: String) extends AnyVal

  case class EmailAddress(value: String) extends AnyVal
  case class AccountAndEmail(account: Account, emailAddress: Option[EmailAddress])

  def apply(zuoraQuerier: ZuoraQuerier)(accountIds: NonEmptyList[AccountId]): ClientFailableOp[List[AccountAndEmail]] = {

    val getEmails = GetEmails(zuoraQuerier)_
    val getContacts = GetContacts(zuoraQuerier)_

    for {
      identityForBillingContact <- getContacts(accountIds)
      emailForBillingContact <- MaybeNonEmptyList(identityForBillingContact.keys.toList).map(getEmails).getOrElse(ClientSuccess(Map.empty[Any, Nothing]))
    } yield {
      identityForBillingContact.map {
        case (contact, account) =>
          AccountAndEmail(account, emailForBillingContact.get(contact).flatten)
      }.toList
    }
  }

  case class ContactId(value: String) extends AnyVal
  case class IdentityId(value: String) extends AnyVal
  case class SFContactId(value: String) extends AnyVal

  case class Account(identityId: Option[IdentityId], sfContactId: SFContactId)

  object GetContacts {

    case class WireAccount(BillToId: String, IdentityId__c: Option[String], sfContactId__c: String)
    implicit val readWireAccount = Json.reads[WireAccount]

    def apply(zuoraQuerier: ZuoraQuerier)(accountIds: NonEmptyList[AccountId]): ClientFailableOp[Map[ContactId, Account]] =
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
          Account(
            acc.IdentityId__c.map(IdentityId.apply),
            SFContactId(acc.sfContactId__c)
          )
        )
      }.toMap

  }

  object GetEmails {

    case class WireContact(Id: String, WorkEmail: Option[String])
    implicit val readWireContact = Json.reads[WireContact]

    def apply(zuoraQuerier: ZuoraQuerier)(contactIds: NonEmptyList[ContactId]): ClientFailableOp[Map[ContactId, Option[EmailAddress]]] =
      for {
        or <- OrTraverse(contactIds) { accountId =>
          zoql"""Id = ${accountId.value}"""
        }
        query <- zoql"SELECT Id, WorkEmail FROM Contact WHERE $or"
        result <- zuoraQuerier[WireContact](query)
        _ <- if (result.done) ClientSuccess(()) else GenericError("oops, query was too big for one page")
      } yield result.records.map { contact =>
        (
          ContactId(contact.Id),
          contact.WorkEmail.map(EmailAddress.apply)
        )
      }.toMap

  }

}
