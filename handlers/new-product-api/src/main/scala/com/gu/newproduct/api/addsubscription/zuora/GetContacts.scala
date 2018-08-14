package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.{Country, CountryGroup}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetContacts {

  object WireModel {

    case class ZuoraContact(firstName: String, lastName: String, workEmail: Option[String], country: Option[String])

    //TODO IS ANY OR BOTH OF THESE CONTACTS OPTIONAL ?
    case class GetContactsResponse(billToContact: ZuoraContact, soldToContact: ZuoraContact)

    implicit val ZuoraContactReads = Json.reads[ZuoraContact]
    implicit val ZuoraContactsReads = Json.reads[GetContactsResponse]

    def fromwireContact(zuoraContact: ZuoraContact): Contact = Contact(
      FirstName(zuoraContact.firstName),
      LastName(zuoraContact.lastName),
      zuoraContact.workEmail.map(Email),
      zuoraContact.country.flatMap(CountryGroup.countryByNameOrCode(_))
    )

    def fromWireContacts(zuoraAccount: GetContactsResponse) = Contacts(
      billTo = fromwireContact(zuoraAccount.billToContact),
      soldTo = fromwireContact(zuoraAccount.soldToContact)
    )

  }

  import WireModel._

  case class FirstName(value: String) extends AnyVal

  case class LastName(value: String) extends AnyVal

  case class Email(value: String) extends AnyVal

  case class Contact(firstName: FirstName, lastName: LastName, email: Option[Email], country: Option[Country])
  case class Contacts(billTo: Contact, soldTo: Contact)

  def apply(get: RequestsGet[GetContactsResponse])(accountId: ZuoraAccountId): ClientFailableOp[Contacts] =
    get(s"accounts/${accountId.value}", WithCheck).map(fromWireContacts)
}
