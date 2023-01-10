package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.i18n.CountryGroup.countryByNameOrCode
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import play.api.libs.json.Json

object GetContacts {

  object WireModel {

    def toField[FIELD](maybeString: Option[String], toField: String => FIELD): Option[FIELD] = maybeString match {
      case None => None
      case Some("") => None
      case Some(string) => Some(toField(string))
    }

    def stringToCountry(countryString: String, countryType: String): ClientFailableOp[Country] =
      countryByNameOrCode(countryString).toClientFailable(s"Unknown $countryType country: $countryString")

    case class ZuoraBillTo(
        Title__c: Option[String],
        firstName: String,
        lastName: String,
        workEmail: Option[String],
        address1: Option[String],
        address2: Option[String],
        city: Option[String],
        state: Option[String],
        country: Option[String],
        zipCode: Option[String],
    ) {
      def toBillToContact: ClientFailableOp[BillToContact] = {

        val clientFailableCountry = country match {
          case None => ClientSuccess(None)
          case Some(countryStr) => stringToCountry(countryStr, "billTo").map(Some(_))
        }

        clientFailableCountry.map { billToCountry =>
          BillToContact(
            toField(Title__c, Title.apply),
            FirstName(firstName),
            LastName(lastName),
            workEmail.map(Email),
            BillToAddress(
              toField(address1, Address1.apply),
              toField(address2, Address2.apply),
              toField(city, City.apply),
              toField(state, State.apply),
              billToCountry,
              toField(zipCode, Postcode.apply),
            ),
          )
        }
      }
    }

    case class ZuoraSoldTo(
        Title__c: Option[String],
        firstName: String,
        lastName: String,
        workEmail: Option[String],
        country: String,
        address1: Option[String],
        address2: Option[String],
        city: Option[String],
        state: Option[String],
        zipCode: Option[String],
    ) {
      def toSoldToContact = {
        stringToCountry(country, "soldTo") map { country =>
          SoldToContact(
            toField(Title__c, Title.apply),
            FirstName(firstName),
            LastName(lastName),
            workEmail.map(Email),
            SoldToAddress(
              toField(address1, Address1.apply),
              toField(address2, Address2.apply),
              toField(city, City.apply),
              toField(state, State.apply),
              country,
              toField(zipCode, Postcode.apply),
            ),
          )
        }

      }
    }

    case class GetContactsResponse(billToContact: ZuoraBillTo, soldToContact: ZuoraSoldTo)

    implicit val ZuoraBillToReads = Json.reads[ZuoraBillTo]
    implicit val ZuoraSoldToReads = Json.reads[ZuoraSoldTo]
    implicit val ZuoraContactsReads = Json.reads[GetContactsResponse]

    def fromWireContacts(zuoraAccount: GetContactsResponse): ClientFailableOp[Contacts] = for {
      billTo <- zuoraAccount.billToContact.toBillToContact
      soldTo <- zuoraAccount.soldToContact.toSoldToContact
    } yield Contacts(billTo, soldTo)

  }

  import WireModel._

  sealed trait AddressField {
    def value: String
  }

  case class FirstName(value: String) extends AddressField

  case class LastName(value: String) extends AddressField

  case class Email(value: String) extends AddressField

  case class Title(value: String) extends AddressField

  case class Address1(value: String) extends AddressField

  case class Address2(value: String) extends AddressField

  case class City(value: String) extends AddressField

  case class State(value: String) extends AddressField

  case class Postcode(value: String) extends AddressField

  case class SoldToAddress(
      address1: Option[Address1],
      address2: Option[Address2],
      city: Option[City],
      state: Option[State],
      country: Country,
      postcode: Option[Postcode],
  )

  case class BillToAddress(
      address1: Option[Address1],
      address2: Option[Address2],
      city: Option[City],
      state: Option[State],
      country: Option[Country],
      postcode: Option[Postcode],
  )

  case class BillToContact(
      title: Option[Title],
      firstName: FirstName,
      lastName: LastName,
      email: Option[Email],
      address: BillToAddress,
  )

  case class SoldToContact(
      title: Option[Title],
      firstName: FirstName,
      lastName: LastName,
      email: Option[Email],
      address: SoldToAddress,
  )

  case class Contacts(billTo: BillToContact, soldTo: SoldToContact)

  def apply(get: RequestsGet[GetContactsResponse])(accountId: ZuoraAccountId): ClientFailableOp[Contacts] =
    get(s"accounts/${accountId.value}", WithCheck).flatMap(fromWireContacts)
}
