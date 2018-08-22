package com.gu.newproduct.api.addsubscription.email.contributions

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BilltoContact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.newproduct.api.addsubscription.Formatters._
import scala.concurrent.Future

object SendConfirmationEmailContributions extends Logging {

  case class ContributionsEmailData(
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate,
    billTo: BilltoContact
  )

  def apply(
    etSqsSend: ETPayload[ContributionFields] => Future[Unit],
    getCurrentDate: () => LocalDate
  )(data: ContributionsEmailData) = {
    val maybeContributionFields = toContributionFields(getCurrentDate(), data)
    val response = for {
      etPayload <- toPayload(maybeContributionFields)
      sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending sqs message")
    } yield sendMessageResult

    response.replace(ContinueProcessing(()))

  }

  def toPayload(maybeContributionFields: Option[ContributionFields]): AsyncApiGatewayOp[ETPayload[ContributionFields]] =
    maybeContributionFields.map { fields =>
      val payload = ETPayload(fields.EmailAddress, fields, DataExtensionName("regular-contribution-thank-you"))
      ContinueProcessing(payload).toAsync
    }.getOrElse {
      logger.info("Not enough data in zuora account to send contribution thank you email, skipping")
      ReturnWithResponse(ApiGatewayResponse.successfulExecution).toAsync
    }

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def toContributionFields(currentDate: LocalDate, data: ContributionsEmailData): Option[ContributionFields] = {

    val maybeDirectDebit = data.paymentMethod match {
      case d: DirectDebit => Some(d)
      case _ => None
    }
    data.billTo.email.map { email =>
      ContributionFields(
        EmailAddress = email.value,
        created = currentDate.toString,
        amount = data.amountMinorUnits.formatted,
        currency = data.currency.glyph,
        edition = data.billTo.country.map(_.alpha2).getOrElse(""),
        name = data.billTo.firstName.value,
        product = "monthly-contribution",
        `account name` = maybeDirectDebit.map(_.accountName.value),
        `account number` = maybeDirectDebit.map(_.accountNumberMask.value),
        `sort code` = maybeDirectDebit.map(_.sortCode.hyphenated),
        `Mandate ID` = maybeDirectDebit.map(_.mandateId.value),
        `first payment date` = maybeDirectDebit.map { _ =>
          data.firstPaymentDate.format(firstPaymentDateFormat)
        },
        `payment method` = maybeDirectDebit.map(_ => "Direct Debit")
      )
    }
  }
}
