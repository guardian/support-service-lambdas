package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.{Country, CountryGroup}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetBillToContact {

  object WireModel {

    case class ZuoraContact(firstName: String, lastName: String, workEmail: Option[String], country: Option[String])

    case class GetBillToResponse(billToContact: ZuoraContact)

    implicit val ZuoraContactReads = Json.reads[ZuoraContact]
    implicit val ZuoraContactsReads = Json.reads[GetBillToResponse]

    def fromWire(zuoraAccount: GetBillToResponse): Contact = {
      val zBillto = zuoraAccount.billToContact
      Contact(
        FirstName(zBillto.firstName),
        LastName(zBillto.lastName),
        zBillto.workEmail.map(Email),
        zBillto.country.flatMap(CountryGroup.countryByNameOrCode(_))
      )
    }
  }

  import WireModel._

  case class FirstName(value: String) extends AnyVal

  case class LastName(value: String) extends AnyVal

  case class Email(value: String) extends AnyVal

  case class Contact(firstName: FirstName, lastName: LastName, email: Option[Email], country: Option[Country])

  def apply(get: RequestsGet[GetBillToResponse])(accountId: ZuoraAccountId): ClientFailableOp[Contact] =
    get(s"accounts/${accountId.value}", WithCheck).map(fromWire)
}
