package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.i18n.CountryGroup.countryByNameOrCode
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.Json
import com.gu.newproduct.api.addsubscription.TypeConvert._

object GetContacts {

  object WireModel {

    case class ZuoraBillTo(firstName: String, lastName: String, workEmail: Option[String], country: Option[String])

    case class ZuoraSoldTo(firstName: String, lastName: String, workEmail: Option[String], country: String)

    case class GetContactsResponse(billToContact: ZuoraBillTo, soldToContact: ZuoraSoldTo)

    implicit val ZuoraBillToReads = Json.reads[ZuoraBillTo]
    implicit val ZuoraSoldToReads = Json.reads[ZuoraSoldTo]
    implicit val ZuoraContactsReads = Json.reads[GetContactsResponse]

    def stringToCountry(countryString: String, countryType: String): ClientFailableOp[Country] =
      countryByNameOrCode(countryString).toClientFailable(s"Unknown $countryType country: $countryString")

    def fromWireContacts(zuoraAccount: GetContactsResponse): ClientFailableOp[Contacts] = {
      for {
        billToCountry <- zuoraAccount.billToContact.country match {
          case None => ClientSuccess(None)
          case Some(countryStr) => stringToCountry(countryStr, "billTo").map(Some(_))
        }
        soldToCountry <- stringToCountry(zuoraAccount.soldToContact.country, "soldTo")
      } yield {
        val billTo = BilltoContact(
          FirstName(zuoraAccount.billToContact.firstName),
          LastName(zuoraAccount.billToContact.lastName),
          email = zuoraAccount.billToContact.workEmail.map(Email),
          country = billToCountry
        )
        val soldTo = SoldToContact(
          FirstName(zuoraAccount.soldToContact.firstName),
          LastName(zuoraAccount.soldToContact.lastName),
          email = zuoraAccount.soldToContact.workEmail.map(Email),
          country = soldToCountry
        )
        Contacts(billTo, soldTo)
      }
    }

  }

  import WireModel._

  case class FirstName(value: String) extends AnyVal

  case class LastName(value: String) extends AnyVal

  case class Email(value: String) extends AnyVal

  case class BilltoContact(firstName: FirstName, lastName: LastName, email: Option[Email], country: Option[Country])

  case class SoldToContact(firstName: FirstName, lastName: LastName, email: Option[Email], country: Country)

  case class Contacts(billTo: BilltoContact, soldTo: SoldToContact)

  def apply(get: RequestsGet[GetContactsResponse])(accountId: ZuoraAccountId): ClientFailableOp[Contacts] =
    get(s"accounts/${accountId.value}", WithCheck).flatMap(fromWireContacts)
}
