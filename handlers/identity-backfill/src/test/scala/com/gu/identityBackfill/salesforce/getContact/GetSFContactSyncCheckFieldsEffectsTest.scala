package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSFContactSyncCheckFieldsEffectsTest extends AnyFlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      sfAuth <- SalesforceClient(RawEffects.response, sfConfig).value.toDisjunction
      getOp = sfAuth.wrapWith(JsonHttp.get)
      result <- GetSFContactSyncCheckFields(getOp)
        .apply(SFEffectsData.testAccountHasNamePhoneOtherAddress)
        .value
        .toDisjunction
    } yield result

    actual should be(
      Right(
        List(
          ContactSyncCheckFields(
            "0036E00000WtQpJQAV",
            Some("01220000000VB52AAG"),
            "testerson",
            "test",
            Some("Afghanistan"),
            Some("effecttests@gu.com"),
          ),
        ),
      ),
    )

  }

}
