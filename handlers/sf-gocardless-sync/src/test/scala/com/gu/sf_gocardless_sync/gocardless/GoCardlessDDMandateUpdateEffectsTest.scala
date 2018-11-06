package com.gu.sf_gocardless_sync.gocardless

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_gocardless_sync.SyncSharedObjects.GoCardlessMandateUpdateID
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateUpdate.{GetBankDetail, GetEventsSince, GoCardlessCustomerBankAccountID}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.{FlatSpec, Matchers}

class GoCardlessDDMandateUpdateEffectsTest extends FlatSpec with Matchers {

  it should "fetch a set of mandate events from GoCardless, with accompanying basic mandate detail" taggedAs EffectsTest in {

    val actual = for {
      goCardlessConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[GoCardlessConfig]
      response = RawEffects.response
      goCardlessClient = GoCardlessClient(response, goCardlessConfig)
      wiredOp = GetEventsSince(goCardlessClient.wrapWith(JsonHttp.get), goCardlessConfig.batchSize)
      result = wiredOp(GoCardlessMandateUpdateID("EV002140EW1YFZ"))
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

  it should "fetch bank details given a customer_account_id" taggedAs EffectsTest in {

    val actual = for {
      goCardlessConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[GoCardlessConfig]
      response = RawEffects.response
      goCardlessClient = GoCardlessClient(response, goCardlessConfig)
      wiredOp = GetBankDetail(goCardlessClient.wrapWith(JsonHttp.get))
      result = wiredOp(GoCardlessCustomerBankAccountID("MD0004D28YHWH2")) //TODO this needs to change
    } yield result

    System.err.println()
    System.err.println(actual)
    System.err.println()

  }

}
