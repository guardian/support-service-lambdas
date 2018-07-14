package com.gu.sf_contact_merge

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.{MaybeNonEmptyList, OrTraverse}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.NonEmptyList

object GetZuoraEmailsForAccounts {

  case class AccountId(value: String) extends AnyVal

  case class EmailAddress(value: String) extends AnyVal
  def apply(zuoraQuerier: ZuoraQuerier)(accountIds: NonEmptyList[AccountId]): ClientFailableOp[List[Option[EmailAddress]]] = {

    val getEmails = GetEmails(zuoraQuerier)_
    val getContacts = GetContacts(zuoraQuerier)_

    for {
      billToContacts <- getContacts(accountIds)
      emailAddresses <- MaybeNonEmptyList(billToContacts).map(getEmails).getOrElse(ClientSuccess(Nil))
    } yield emailAddresses
  }

  case class ContactId(value: String) extends AnyVal

  object GetContacts {

    case class WireAccount(BillToId: String)
    implicit val readWireAccount = Json.reads[WireAccount]

    def apply(zuoraQuerier: ZuoraQuerier)(accountIds: NonEmptyList[AccountId]): ClientFailableOp[List[ContactId]] =
      for {
        or <- OrTraverse(accountIds) { accountId =>
          zoql"""Id = ${accountId.value}"""
        }
        query <- zoql"SELECT BillToId FROM Account WHERE $or"
        result <- zuoraQuerier[WireAccount](query)
        _ <- if (result.done) ClientSuccess(()) else GenericError("oops, query was too big for one page")
      } yield result.records.map(acc => ContactId(acc.BillToId))

  }

  object GetEmails {

    case class WireContact(WorkEmail: Option[String])
    implicit val readWireContact = Json.reads[WireContact]

    def apply(zuoraQuerier: ZuoraQuerier)(contactIds: NonEmptyList[ContactId]): ClientFailableOp[List[Option[EmailAddress]]] =
      for {
        or <- OrTraverse(contactIds) { accountId =>
          zoql"""Id = ${accountId.value}"""
        }
        query <- zoql"SELECT WorkEmail FROM Contact WHERE $or"
        result <- zuoraQuerier[WireContact](query)
        _ <- if (result.done) ClientSuccess(()) else GenericError("oops, query was too big for one page")
      } yield result.records.map(contact => contact.WorkEmail.map(EmailAddress.apply))

  }

}
