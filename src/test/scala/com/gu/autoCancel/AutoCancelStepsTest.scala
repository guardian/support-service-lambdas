package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelFilter2.ACFilterDeps
import com.gu.effects.RawEffects
import com.gu.util.ETConfig.ETSendKeysForAttempt
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.apigateway.{ ApiGatewayRequest, URLParams }
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.{ Config, ETConfig, TrustedApiConfig, ZuoraRestConfig }
import okhttp3._
import okhttp3.internal.Util.UTF_8
import okio.Buffer
import org.joda.time.LocalDate
import org.scalatest._

import scala.util.Success
import scalaz.{ Reader, \/ }

class AutoCancelStepsTest extends FlatSpec with Matchers {

  val basicInfo = BasicAccountInfo("id123", 11.99)
  val subscription = SubscriptionSummary(SubscriptionId("id123"), "A-S123", "Active")
  val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")

  "auto cancel filter 2" should "cancel attempt" in {
    var doAutoCancelAccountId: Option[String] = None
    def doAutoCancel(accountId: String, subToCancel: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
      doAutoCancelAccountId = Some(accountId)
      WithDependenciesFailableOp.liftT(())
    }
    val autoCancelJson =
      """
        |{"accountId": "AID", "autoPay": "true", "paymentMethodType": "GoldBars"}
      """.stripMargin // should probaly base on a real payload
    val fakeRequest = ApiGatewayRequest(Some(URLParams(None, None, Some("false"))), autoCancelJson)
    val aCDeps = ACFilterDeps(
      doAutoCancel = doAutoCancel,
      getAccountSummary = _ => WithDependenciesFailableOp.liftT(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice)))
    )
    AutoCancelSteps(aCDeps)(fakeRequest).run.run(new TestingRawEffects(false, 1).configHttp)

    doAutoCancelAccountId should be(Some("AID"))
  }

  "auto cancel" should "turn off auto pay" in {
    val effects = new TestingRawEffects(false, 200)
    val autoCancelJson =
      """
        |{"accountId": "AID", "autoPay": "true", "paymentMethodType": "GoldBars"}
      """.stripMargin // should probaly base on a real payload
    val fakeRequest = ApiGatewayRequest(Some(URLParams(None, None, Some("false"))), autoCancelJson)
    AutoCancel("AID", SubscriptionId("subid"), LocalDate.now).run.run(effects.configHttp)

    effects.result.map { request =>
      val buffer = new Buffer()
      request.body().writeTo(buffer)
      val body = buffer.readString(UTF_8)
      val url = request.url
      (request.method(), url.encodedPath(), body)
    } should contain(("PUT", "/accounts/AID", "{\"autoPay\":false}"))
  }

}

class TestingRawEffects(val isProd: Boolean, val code: Int) {

  var result: List[Request] = Nil // !

  val stage = if (isProd) "PROD" else "DEV"

  def response: Request => Response = {
    req =>
      result = req :: result
      new Response.Builder().request(req).protocol(Protocol.HTTP_1_1).code(code).body(ResponseBody.create(MediaType.parse("text/plain"), """{"success": true}""")).build()
  }

  val rawEffects = RawEffects(response, () => stage, _ => Success(""))

  val fakeConfig = Config(stage, TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
    etConfig = ETConfig(stageETIDForAttempt = ETSendKeysForAttempt(Map(0 -> "h")), clientId = "jjj", clientSecret = "kkk"))

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
