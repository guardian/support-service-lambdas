package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.{Country, CountryGroup}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp}
import play.api.libs.json.Json

object GetContacts {

  object WireModel {

    case class ZuoraContact(firstName: String, lastName: String, workEmail: Option[String], country: Option[String])

    case class ZuoraContacts(billToContact: ZuoraContact, soldToContact: ZuoraContact)

    implicit val ZuoraContactReads = Json.reads[ZuoraContact]
    implicit val ZuoraContactsReads = Json.reads[ZuoraContacts]

    def fromWire(zuoraAccount: ZuoraContacts): Contacts = {
      val zBillto = zuoraAccount.billToContact
      val zSoldTo = zuoraAccount.soldToContact
      Contacts(
        billTo = Contact(
          FirstName(zBillto.firstName),
          LastName(zBillto.lastName),
          zBillto.workEmail.map(Email),
          zBillto.country.flatMap(CountryGroup.countryByNameOrCode(_))
        ),
        soldTo = Contact(
          FirstName(zSoldTo.firstName),
          LastName(zSoldTo.lastName),
          zSoldTo.workEmail.map(Email),
          zSoldTo.country.flatMap(CountryGroup.countryByNameOrCode(_))

        )
      )
    }
  }

  import WireModel._

  case class FirstName(value: String) extends AnyVal

  case class LastName(value: String) extends AnyVal

  case class Email(value: String) extends AnyVal

  case class Contact(firstName: FirstName, lastName: LastName, email: Option[Email], country: Option[Country]) //TODO are the first or
  // last names
  // optional ?
  //todo do we need both contacts ? also if one or both are missing we should return none!!!
  case class Contacts(billTo: Contact, soldTo: Contact)

  def apply(get: RequestsGet[ZuoraContacts])(accountId: ZuoraAccountId): ClientFailableOp[Contacts] =
    get(s"accounts/${accountId.value}", WithCheck).map(fromWire)
}
