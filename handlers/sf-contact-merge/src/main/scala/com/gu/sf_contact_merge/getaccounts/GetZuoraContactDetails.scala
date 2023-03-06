package com.gu.sf_contact_merge.getaccounts

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.OrTraverse
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import cats.data.NonEmptyList

object GetZuoraContactDetails {

  case class ContactId(value: String) extends AnyVal

  case class EmailAddress(value: String) extends AnyVal
  object EmailAddress {
    def apply(value: String) = new EmailAddress(value.toLowerCase)
  }
  case class FirstName(value: String) extends AnyVal
  case class LastName(value: String) extends AnyVal
  case class ZuoraContactDetails(emailAddress: Option[EmailAddress], firstName: Option[FirstName], lastName: LastName)

  case class WireContact(
      Id: String,
      WorkEmail: Option[String],
      FirstName: String,
      LastName: String,
  )

  implicit val readWireContact = Json.reads[WireContact]

  def apply(zuoraQuerier: ZuoraQuerier): GetZuoraContactDetails = (contactIds: NonEmptyList[ContactId]) =>
    for {
      or <- OrTraverse(contactIds) { accountId =>
        zoql"""Id = ${accountId.value}"""
      }
      query <- zoql"SELECT Id, WorkEmail, FirstName, LastName FROM Contact WHERE $or"
      result <- zuoraQuerier[WireContact](query)
      _ <- if (result.done) ClientSuccess(()) else GenericError("oops, query was too big for one page")
    } yield result.records.map { contact =>
      (
        ContactId(contact.Id),
        ZuoraContactDetails(
          contact.WorkEmail.map(EmailAddress.apply),
          Some(FirstName(contact.FirstName)).filter(_.value != "."),
          LastName(contact.LastName),
        ),
      )
    }.toMap

}

trait GetZuoraContactDetails {
  def apply(
      contactIds: NonEmptyList[GetZuoraContactDetails.ContactId],
  ): ClientFailableOp[Map[GetZuoraContactDetails.ContactId, GetZuoraContactDetails.ZuoraContactDetails]]
}
