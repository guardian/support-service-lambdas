package com.gu.newproduct.api.addsubscription

import com.gu.effects.{GetFromS3, Http}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HealthCheckEffectsTest extends AnyFlatSpec with Matchers {

  it should "pass" taggedAs EffectsTest in {

    val stage = Stage("CODE")
    val actual = (for {
      zuoraConfig <- LoadConfigModule(stage, GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraClient = ZuoraRestRequestMaker(Http.response, zuoraConfig)
      getAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _
    } yield HealthCheck(getAccount, AccountIdentitys.accountIdentitys(stage))).apiResponse

    actual.statusCode should be("200")
  }

}
