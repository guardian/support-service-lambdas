package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.DirectDebit
import play.api.libs.json.Json

case class ContributionFields(
  EmailAddress: String,
  created: String,
  amount: String,
  currency: String,
  edition: String,
  name: String,
  product: String,
  `account name`: Option[String] = None,
  `account number`: Option[String] = None,
  `sort code`: Option[String] = None,
  `Mandate ID`: Option[String] = None,
  `first payment date`: Option[String] = None,
  `payment method`: Option[String] = None
)

object ContributionFields {
  implicit val writes = Json.writes[ContributionFields]

  protected def hyphenate(s: String): String = s"${s.substring(0, 2)}-${s.substring(2, 4)}-${s.substring(4, 6)}"

  protected def formatAmount(amount: AmountMinorUnits): String = (amount.value / BigDecimal(100)).bigDecimal.stripTrailingZeros
    .toPlainString

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def fromData(
    amountMinorUnits: AmountMinorUnits,
    created: LocalDate,
    currency: Currency,
    directDebit: Option[DirectDebit],
    billTo: Contact
  ): Option[ContributionFields] = {

    billTo.email.map { email =>
      ContributionFields(
        EmailAddress = email.value,
        created = created.toString,
        amount = formatAmount(amountMinorUnits),
        currency = currency.glyph,
        edition = billTo.country.map(_.alpha2).getOrElse(""),
        name = s"${billTo.firstName.value} ${billTo.lastName.value}",
        product = "monthly-contribution",
        `account name` = directDebit.map(_.accountName.value),
        `account number` = directDebit.map(_.accountNumberMask.value),
        `sort code` = directDebit.map(x => hyphenate(x.sortCode.value)),
        `Mandate ID` = directDebit.map(_.mandateId.value),
        `first payment date` = directDebit.map { _ =>
          val firstPayment = created.plusDays(10) // todo the contract acceptance date should be at the same time as the first payment date
          val formatted = firstPayment.format(firstPaymentDateFormat)
          formatted
        },
        `payment method` = directDebit.map(_ => "Direct Debit")
      )

    }
  }
}
