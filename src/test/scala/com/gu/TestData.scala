package com.gu

import com.gu.TestingRawEffects.BasicResult
import com.gu.effects.RawEffects
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.{ FailableOp, WithDepsFailableOp, _ }
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{ InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice }
import okhttp3._
import okhttp3.internal.Util.UTF_8
import okio.Buffer
import java.time.LocalDate
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

  val fakeConfig = Config(
    stage = Stage("DEV"),
    trustedApiConfig = fakeApiConfig,
    zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"),
    stripeConfig = StripeConfig(ukStripeSecretKey = StripeSecretKey("abc"), auStripeSecretKey = StripeSecretKey("def")))

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
      |  },
      |  "stripe": {
      |     "api.key.secret": "abc",
      |     "au-membership.key.secret": "def"
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

object TestingRawEffects {

  case class BasicResult(method: String, path: String, body: String)

}

class TestingRawEffects(val isProd: Boolean = false, val defaultCode: Int = 1, responses: Map[String, (Int, String)] = Map()) {

  var result: List[Request] = Nil // !

  val stage = Stage(if (isProd) "PROD" else "DEV")

  def basicResults = result.map { request =>
    val buffer = new Buffer()
    Option(request.body()).foreach(_.writeTo(buffer))
    val body = buffer.readString(UTF_8)
    val url = request.url
    BasicResult(request.method(), url.encodedPath(), body)
  }

  val response: Request => Response = {
    req =>
      result = req :: result
      val (code, response) = responses.getOrElse(req.url().encodedPath(), (defaultCode, """{"success": true}"""))
      println(s"request for: ${req.url().encodedPath()} so returning $response")
      new Response.Builder()
        .request(req)
        .protocol(Protocol.HTTP_1_1)
        .code(code)
        .body(ResponseBody.create(MediaType.parse("text/plain"), response))
        .message("message??")
        .build()
  }

  val rawEffects = RawEffects(response, stage, _ => Success(TestData.codeConfig), () => LocalDate.of(2017, 11, 19))

  //  val fakeConfig = Config(stage, TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
  //    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"))

  def handlerDeps(operation: Config => ApiGatewayRequest => FailableOp[Unit]) = HandlerDeps(() => Success(""), Stage("DEV"), _ => Success(TestData.fakeConfig), operation)
  val zuoraDeps = ZuoraDeps(response, TestData.fakeZuoraConfig)

}

object WithDependenciesFailableOp {

  // if we have a failable op in a for comprehension, this call sits at the end of the line to massage the type
  implicit class FailableOpOps[A](failableOp: FailableOp[A]) {

    def toEitherTPureReader[T]: WithDepsFailableOp[T, A] =
      Reader[T, FailableOp[A]]((_: T) => failableOp).toEitherT

  }

  // lifts any plain value all the way in, usually useful in tests
  def liftT[R, T](value: R): WithDepsFailableOp[T, R] =
    \/.right(value).toEitherTPureReader[T]

  // lifts any plain value all the way in, usually useful in tests
  def liftR[R, T](value: R): Reader[T, FailableOp[R]] =
    //\/.right(value).toReader[T]
    Reader[T, FailableOp[R]]((_: T) => \/.right(value))
}
