package com.gu

import java.time.LocalDate

import com.gu.effects.TestingRawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.stripeCustomerSourceUpdated.{ StripeDeps, StripeSignatureChecker }
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util._
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{ InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice }
import com.gu.util.zuora.internal.Types.{ ClientFailableOp, WithDepsClientFailableOp, _ }
import com.gu.util.zuora.{ ZuoraDeps, ZuoraRestConfig }
import org.scalatest.Matchers
import play.api.libs.json.Json

import scala.util.Success
import scalaz.{ Reader, \/ }

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
  val fakeETSendIds = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can"))
  val fakeETConfig = ETConfig(etSendIDs = fakeETSendIds, "fakeClientId", "fakeClientSecret")
  val fakeStripeConfig = StripeConfig(customerSourceUpdatedWebhook = StripeWebhook(StripeSecretKey("ukCustomerSourceUpdatedSecretKey"), StripeSecretKey("auCustomerSourceUpdatedStripeSecretKey")), true)

  val fakeConfig = Config(
    stage = Stage("DEV"),
    trustedApiConfig = fakeApiConfig,
    stepsConfig = StepsConfig(zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg")),
    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"),
    stripeConfig = StripeConfig(customerSourceUpdatedWebhook = StripeWebhook(ukStripeSecretKey = StripeSecretKey("abc"), auStripeSecretKey = StripeSecretKey("def")), true))

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  val handlerDeps =
    (Stage("DEV"), Success(""))
  def zuoraDeps(effects: TestingRawEffects) = ZuoraDeps(effects.response, TestData.fakeZuoraConfig)
  val stripeDeps = StripeDeps(TestData.fakeStripeConfig, new StripeSignatureChecker)

}

object WithDependenciesFailableOp {

  // if we have a failable op in a for comprehension, this call sits at the end of the line to massage the type
  implicit class FailableOpOps[A](failableOp: ClientFailableOp[A]) {

    def toEitherTPureReader[T]: WithDepsClientFailableOp[T, A] =
      Reader[T, ClientFailableOp[A]]((_: T) => failableOp).toEitherT

  }

  // lifts any plain value all the way in, usually useful in tests
  def liftT[R, T](value: R): WithDepsClientFailableOp[T, R] =
    \/.right(value).toEitherTPureReader[T]

}
