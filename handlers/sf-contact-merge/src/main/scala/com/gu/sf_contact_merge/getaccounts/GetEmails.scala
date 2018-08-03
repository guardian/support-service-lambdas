package com.gu.sf_contact_merge.getaccounts

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.OrTraverse
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.NonEmptyList

object GetEmails {

  case class ContactId(value: String) extends AnyVal

  case class EmailAddress(value: String) extends AnyVal

  case class WireContact(Id: String, WorkEmail: Option[String])
  implicit val readWireContact = Json.reads[WireContact]

  def apply(zuoraQuerier: ZuoraQuerier, contactIds: NonEmptyList[ContactId]): ClientFailableOp[Map[ContactId, Option[EmailAddress]]] =
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
