package com.gu.newproduct.api.addsubscription.email.contributions

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.reader.AsyncTypes._
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.ETPayload

import scala.concurrent.Future

object SendConfirmationEmail extends Logging {

  case class ContributionsEmailData(
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate
  )

  def apply(
    etSqsSend: ETPayload[ContributionFields] => Future[Unit],
    getCurrentDate: () => LocalDate,
    getBillTo: ZuoraAccountId => ClientFailableOp[Contact]
  )(data: ContributionsEmailData) = {

    val response = for {
      billTo <- getBillTo(data.accountId).toAsyncApiGatewayOp("getting billTo contact from Zuora")
      maybeContributionFields = toContributionFields(getCurrentDate(), billTo, data)
      etPayload <- toPayload(maybeContributionFields)
      sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending sqs message")
    } yield sendMessageResult

    response.replace(ContinueProcessing(()))

  }

  def toPayload(maybeContributionFields: Option[ContributionFields]): AsyncApiGatewayOp[ETPayload[ContributionFields]] =
    maybeContributionFields.map { fields =>
      val payload = ETPayload(fields.EmailAddress, fields)
      ContinueProcessing(payload).toAsync
    }.getOrElse {
      logger.info("Not enough data in zuora account to send contribution thank you email, skipping")
      ReturnWithResponse(ApiGatewayResponse.successfulExecution).toAsync
    }

  def hyphenate(s: String) = s"${s.substring(0, 2)}-${s.substring(2, 4)}-${s.substring(4, 6)}"
  def formatAmount(amount: AmountMinorUnits) = (amount.value / BigDecimal(100)).bigDecimal.stripTrailingZeros.toPlainString
  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def toContributionFields(currentDate: LocalDate, billTo: Contact, data: ContributionsEmailData): Option[ContributionFields] = {

    val maybeDirectDebit = data.paymentMethod match {
      case d: DirectDebit => Some(d)
      case _ => None
    }
    billTo.email.map { email =>
      ContributionFields(
        EmailAddress = email.value,
        created = currentDate.toString,
        amount = formatAmount(data.amountMinorUnits),
        currency = data.currency.glyph,
        edition = billTo.country.map(_.alpha2).getOrElse(""),
        name = billTo.firstName.value,
        product = "monthly-contribution",
        `account name` = maybeDirectDebit.map(_.accountName.value),
        `account number` = maybeDirectDebit.map(_.accountNumberMask.value),
        `sort code` = maybeDirectDebit.map(x => hyphenate(x.sortCode.value)),
        `Mandate ID` = maybeDirectDebit.map(_.mandateId.value),
        `first payment date` = maybeDirectDebit.map { _ =>
          data.firstPaymentDate.format(firstPaymentDateFormat)
        },
        `payment method` = maybeDirectDebit.map(_ => "Direct Debit")
      )
    }
  }
}
