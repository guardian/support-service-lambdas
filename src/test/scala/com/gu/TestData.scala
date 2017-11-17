package com.gu

import com.gu.effects.RawEffects
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.{ FailableOp, WithDepsFailableOp }
import com.gu.util.{ Config, ETConfig, TrustedApiConfig, ZuoraRestConfig }
import com.gu.util.zuora.ZuoraModels.{ InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice }
import okhttp3._
import org.joda.time.LocalDate
import org.scalatest.Matchers
import play.api.libs.json.Json
import com.gu.util.reader.Types._

import scala.util.Success
import scalaz.{ Reader, \/ }

object TestData extends Matchers {

  val today = new LocalDate(2016, 11, 21)
  val accountId = "accountId"
  val invoiceItemA = InvoiceItem("invitem123", "A-S123", today, today.plusMonths(1), 49.21, "Non founder - annual", "Supporter")
  val invoiceItemB = InvoiceItem("invitem122", "A-S123", today, today.plusMonths(1), 0, "Friends", "Friend")
  val invoiceItemC = InvoiceItem("invitem121", "A-S123", today, today.plusMonths(1), -4.90, "Percentage", "Discount")

  def itemisedInvoice(balance: Double, invoiceItems: List[InvoiceItem]) = ItemisedInvoice("invoice123", today, 49, balance, "Posted", List(invoiceItemA))

  val basicInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(49, List(invoiceItemA))))
  val weirdInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(0, List(invoiceItemA)), itemisedInvoice(49, List(invoiceItemB, invoiceItemA, invoiceItemC))))

  val fakeApiConfig = TrustedApiConfig("validApiClientId", "validApiToken", "testEnvTenantId")
  val fakeZuoraConfig = ZuoraRestConfig("fakeUrl", "fakeUser", "fakePass")
  val fakeETConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), "fakeClientId", "fakeClientSecret")

  val fakeConfig = Config("DEV", fakeApiConfig, zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"))

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  val codeConfig =
    """
      |{ "stage": "DEV",
      |  "trustedApiConfig": {
      |    "apiClientId": "a",
      |    "apiToken": "b",
      |    "tenantId": "c"
      |  },
      |  "zuoraRestConfig": {
      |    "baseUrl": "https://ddd",
      |    "username": "e@f.com",
      |    "password": "ggg"
      |  },
      |  "etConfig": {
      |    "etSendIDs":
      |    {
      |      "pf1": "111",
      |      "pf2": "222",
      |      "pf3": "333",
      |      "pf4": "444",
      |      "cancelled": "ccc"
      |    },
      |    "clientId": "jjj",
      |    "clientSecret": "kkk"
      |  }
      |}
    """.stripMargin

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

}

class TestingRawEffects(val isProd: Boolean, val defaultCode: Int, responses: Map[String, (Int, String)] = Map()) {

  var result: List[Request] = Nil // !

  val stage = if (isProd) "PROD" else "DEV"

  def response: Request => Response = {
    req =>
      result = req :: result
      val (code, response) = responses.getOrElse(req.url().encodedPath(), (defaultCode, """{"success": true}"""))
      println(s"request for: ${req.url().encodedPath()} so returning $response")
      new Response.Builder().request(req).protocol(Protocol.HTTP_1_1).code(code).body(ResponseBody.create(MediaType.parse("text/plain"), response)).build()
  }

  val rawEffects = RawEffects(response, () => stage, _ => Success(TestData.codeConfig))

  val fakeConfig = Config(stage, TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"))

  val configHttp = StageAndConfigHttp(response, fakeConfig)

}

object WithDependenciesFailableOp {

  // lifts any plain value all the way in, usually useful in tests
  def liftT[R, T](value: R): WithDepsFailableOp[T, R] =
    \/.right(value).toReader[T]

  // lifts any plain value all the way in, usually useful in tests
  def liftR[R, T](value: R): Reader[T, FailableOp[R]] =
    //\/.right(value).toReader[T]
    Reader[T, FailableOp[R]]((_: T) => \/.right(value))
}
