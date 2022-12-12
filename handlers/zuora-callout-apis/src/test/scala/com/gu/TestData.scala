package com.gu

import java.time.LocalDate

import com.gu.effects.TestingRawEffects
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config._
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import play.api.libs.json.Json
import org.scalatest.matchers.should.Matchers

object TestData extends Matchers {

  val today = LocalDate.of(2016, 11, 21)
  val accountId = "accountId"
  val invoiceItemA = InvoiceItem("invitem123", "A-S123", today, today.plusMonths(1), 49.21, "Non founder - annual", "Supporter")
  val invoiceItemB = InvoiceItem("invitem122", "A-S123", today, today.plusMonths(1), 0, "Friends", "Friend")
  val invoiceItemC = InvoiceItem("invitem121", "A-S123", today, today.plusMonths(1), -4.90, "Percentage", "Discount")

  def itemisedInvoice(balance: Double, invoiceItems: List[InvoiceItem]) = ItemisedInvoice("invoice123", today, 49, balance, "Posted", List(invoiceItemA))

  val basicInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(49, List(invoiceItemA))))
  val weirdInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(0, List(invoiceItemA)), itemisedInvoice(49, List(invoiceItemB, invoiceItemA, invoiceItemC))))

  val fakeApiConfig = TrustedApiConfig("validApiToken", "testEnvTenantId")
  val fakeZuoraConfig = ZuoraRestConfig("https://ddd", "fakeUser", "fakePass")

  val missingCredentialsResponse =
    """{
       |"statusCode":"401",
       |"headers":{"Content-Type":"application/json"},
       |"body":"{\n  \"message\" : \"Credentials are missing or invalid\"\n}"
       |}
       |""".stripMargin

  val successfulResponse =
    """{
       |"statusCode":"200",
       |"headers":{"Content-Type":"application/json"},
       |"body":"{\n  \"message\" : \"Success\"\n}"
       |}
       |""".stripMargin

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  def zuoraDeps(effects: TestingRawEffects) = ZuoraRestRequestMaker(effects.response, TestData.fakeZuoraConfig)

}
