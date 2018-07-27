package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.newproduct.api.addsubscription.contributionEmailRequest.ContributionsPayload
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Email
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, PaymentMethod, SortCode}

import scala.concurrent.Future
object contributionEmailRequest {

  case class CurrencyGlyh(value: String) extends AnyVal

  case class Edition(value: String) extends AnyVal //TODO what is edition?
  case class Name(value: String) extends AnyVal //TODO is this first and last name concatenated ?
  case class DirectDebitDetails(
    accountName: BankAccountName,
    accountNumberMask: BankAccountNumberMask,
    sortCode: SortCode,
    mandateId: MandateId,
    firstPaymentDate: LocalDate,
  )

  case class ContributionsPayload(
    emailAddress: Email,
    created: LocalDate,
    amount: Int,
    currencyGlyph: CurrencyGlyh,
    edition: Edition,
    name: Name,
    directDebit: Option[DirectDebitDetails]
  )

}

object SendConfirmationEmail{
  def apply(sqsSend: Payload => Future[Unit])
    (contributionsPayload: ContributionsPayload)  = {
    contributionEmailRequest
  }
}

