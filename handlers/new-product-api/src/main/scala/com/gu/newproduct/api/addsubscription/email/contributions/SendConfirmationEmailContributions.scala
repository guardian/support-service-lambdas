package com.gu.newproduct.api.addsubscription.email.contributions

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToContact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}

import scala.concurrent.Future

object SendConfirmationEmailContributions extends Logging {

  case class ContributionsEmailData(
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate,
    billTo: BillToContact,
    planId: PlanId
  )

  def apply(
    etSqsSend: ETPayload[ContributionFields] => Future[Unit],
    getCurrentDate: () => LocalDate
  )(
    sfContactId: Option[SfContactId],
    data: ContributionsEmailData
  ): AsyncApiGatewayOp[Unit] = {
    val maybeContributionFields = toContributionFields(getCurrentDate(), data)
    for {
      etPayload <- toPayload(sfContactId, maybeContributionFields)
      sendMessageResult <- etSqsSend(etPayload).toAsyncApiGatewayOp("sending contribution email sqs message")
    } yield sendMessageResult

  }

  def toPayload(
    sfContactId: Option[SfContactId],
    maybeContributionFields: Option[ContributionFields]
  ): AsyncApiGatewayOp[ETPayload[ContributionFields]] =
    maybeContributionFields.map { fields =>
      val payload = ETPayload(fields.EmailAddress, fields, DataExtensionName("regular-contribution-thank-you"), sfContactId.map(_.value))
      ContinueProcessing(payload).toAsync
    }.getOrElse {
      logger.info("Not enough data in zuora account to send contribution thank you email, skipping")
      ReturnWithResponse(ApiGatewayResponse.successfulExecution).toAsync
    }

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def toContributionFields(currentDate: LocalDate, data: ContributionsEmailData): Option[ContributionFields] = {

    val productId = data.planId match {
      case AnnualContribution => "annual-contribution"
      case MonthlyContribution => "monthly-contribution"
      case other => other.name
    }
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
        edition = data.billTo.address.country.map(_.alpha2).getOrElse(""),
        name = data.billTo.firstName.value,
        product = productId,
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
