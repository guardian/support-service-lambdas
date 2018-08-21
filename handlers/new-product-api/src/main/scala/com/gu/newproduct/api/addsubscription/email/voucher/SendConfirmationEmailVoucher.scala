package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp

import scala.concurrent.Future

object SendConfirmationEmailVoucher extends Logging {

  case class VoucherEmailData(
    // TODO the fields in here are still not updated from contributions
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate
  )

  def apply(
    etSqsSend: ETPayload[WireVoucherFields] => Future[Unit],
    getCurrentDate: () => LocalDate,
    getBillTo: ZuoraAccountId => ClientFailableOp[Contact]
  )(data: VoucherEmailData) = {

    val response = for {
      billTo <- getBillTo(data.accountId).toAsyncApiGatewayOp("getting billTo contact from Zuora")
      maybeWireModel = toWireModel(getCurrentDate(), billTo, data)
      etPayload <- maybeWireModel.map(toPayload).toApiGatewayContinueProcessing(ApiGatewayResponse.successfulExecution).toAsync
      sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending sqs message")
    } yield sendMessageResult

    response.replace(ContinueProcessing(()))

  }

  implicit val dexName = new DataExtensionName[WireVoucherFields]("paper-voucher")

  def toPayload(fields: WireVoucherFields): ETPayload[WireVoucherFields] =
    ETPayload(fields.EmailAddress, fields)

  def hyphenate(s: String) = s"${s.substring(0, 2)}-${s.substring(2, 4)}-${s.substring(4, 6)}"
  def formatAmount(amount: AmountMinorUnits) = (amount.value / BigDecimal(100)).bigDecimal.stripTrailingZeros.toPlainString
  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def toWireModel(currentDate: LocalDate, billTo: Contact, data: VoucherEmailData): Option[WireVoucherFields] = {

    val maybeDirectDebit = data.paymentMethod match {
      case d: DirectDebit => Some(d)
      case _ => None
    }
    //        billTo.email.map { email =>
    //          WireVoucherFields(
    //            EmailAddress = email.value
    //          )
    //        }
    None // TODO!
  }
}

case class WireVoucherFields(
  // https://github.com/guardian/subscriptions-frontend/blob/207bb039ab4a26e6fa2cc23eb5d6b6d842d662df/app/model/exactTarget/DataExtensionRow.scala#L227

  // here are all the needed fields

  //  payment_method: String, // dd/card,
  // only if payment method is dd
  bank_account_no: Option[String], // formatAccountNumber(accNumber),
  bank_sort_code: Option[String], // formatSortCode(sortCode),
  account_holder: Option[String], // accName,
  mandate_id: Option[String], // mandateId
  //
  //  // billing address only set if it's not the same as delivery address
  billing_address_line_1: Option[String], // billingAddress.lineOne,
  billing_address_line_2: Option[String], // billingAddress.lineTwo,
  billing_address_town: Option[String], // billingAddress.town,
  billing_county: Option[String], // billingAddress.countyOrState,
  billing_postcode: Option[String], // billingAddress.postCode,
  billing_country: Option[String], // billingAddress.country.fold(billingAddress.countryName)(_.name)

  //
  EmailAddress: String, // email,
  ZuoraSubscriberId: String, // subscriptionName.get,
  SubscriberKey: String, // email,
  subscriber_id: String, // subscriptionName.get,
  IncludesDigipack: String, // includesDigipack.toString,
  title: String, // title.fold("")(_.title),
  first_name: String, // firstName,
  last_name: String, // lastName,
  delivery_address_line_1: String, // deliveryAddress.lineOne,
  delivery_address_line_2: String, // deliveryAddress.lineTwo,
  delivery_address_town: String, // deliveryAddress.town,
  delivery_county: String, // deliveryAddress.countyOrState,
  delivery_postcode: String, // deliveryAddress.postCode,
  delivery_country: String, // deliveryAddress.country.fold(deliveryAddress.countryName)(_.name),
  date_of_first_paper: String, // formatDate(startDate),
  date_of_first_payment: String, // formatDate(firstPaymentDate),
  `package`: String, // planName,
  subscription_rate: String // subscriptionDetails

)

object WireVoucherFields {
  // we might need to use a Map[String,String] instead of a Wire model, so that we can manage the mmore than 22 parameters problem
  //  implicit val writes = Json.writes[WireVoucherFields]
}
