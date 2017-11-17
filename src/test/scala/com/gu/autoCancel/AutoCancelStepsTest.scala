package com.gu.autoCancel

import com.gu.{ TestingRawEffects, WithDependenciesFailableOp }
import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.autoCancel.AutoCancelFilter2.ACFilterDeps
import com.gu.effects.RawEffects
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.apigateway.{ ApiGatewayRequest, ResponseModels, URLParams }
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.{ Config, ETConfig, TrustedApiConfig, ZuoraRestConfig }
import okhttp3._
import okhttp3.internal.Util.UTF_8
import okio.Buffer
import org.joda.time.LocalDate
import org.scalatest._

import scala.util.Success
import scalaz.{ Id, Reader, \/, \/- }

class AutoCancelStepsTest extends FlatSpec with Matchers {

  val basicInfo = BasicAccountInfo("id123", 11.99)
  val subscription = SubscriptionSummary(SubscriptionId("sub123"), "A-S123", "Active")
  val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")

  "auto cancel filter 2" should "cancel attempt" in {
    val aCDeps = ACFilterDeps(
      getAccountSummary = _ => WithDependenciesFailableOp.liftT(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice)))
    )
    val autoCancelCallout = AutoCancelHandlerTest.fakeCallout(true)
    val cancel: FailableOp[AutoCancelRequest] = AutoCancelFilter2(LocalDate.now, autoCancelCallout, aCDeps).run.run(new TestingRawEffects(false, 1).configHttp)

    cancel should be(\/-(AutoCancelRequest("id123", SubscriptionId("sub123"), LocalDate.now.minusDays(14))))
  }

  "auto cancel" should "turn off auto pay" in {
    val effects = new TestingRawEffects(false, 200)
    AutoCancel(AutoCancelRequest("AID", SubscriptionId("subid"), LocalDate.now)).run.run(effects.configHttp)

    val requests = effects.result.map { request =>
      val buffer = new Buffer()
      request.body().writeTo(buffer)
      val body = buffer.readString(UTF_8)
      val url = request.url
      (request.method(), url.encodedPath(), body)
    }

    requests should contain(("PUT", "/accounts/AID", "{\"autoPay\":false}"))
  }

  //  // todo need an ACSDeps so we don't need so many mock requests
  //  "auto cancel step" should "turn off auto pay and send email" in {
  //    val effects = new TestingRawEffects(false, 200)
  //    val autoCancelJson =
  //      """
  //        |{"accountId": "AID", "autoPay": "true", "paymentMethodType": "GoldBars"}
  //      """.stripMargin // should probaly base on a real payload
  //    val fakeRequest = ApiGatewayRequest(Some(URLParams(None, None, Some("false"))), autoCancelJson)
  //    val acDeps = ACSDeps()
  //    AutoCancelSteps(acDeps)(AutoCancelRequest("AID", SubscriptionId("subid"), LocalDate.now)).run.run(effects.configHttp)
  //
  //    val requests = effects.result.map { request =>
  //      val buffer = new Buffer()
  //      request.body().writeTo(buffer)
  //      val body = buffer.readString(UTF_8)
  //      val url = request.url
  //      (request.method(), url.encodedPath(), body)
  //    }
  //
  //    requests should contain(("PUT", "/accounts/AID", "{\"autoPay\":false}"))
  //    requests should contain(("POST", "/EMAILSEND/AID", "{\"autoPay\":false}"))
  //  }

}
