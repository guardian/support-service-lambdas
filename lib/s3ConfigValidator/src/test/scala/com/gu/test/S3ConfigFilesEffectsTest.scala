package com.gu.test
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokensConfig
import com.gu.effects.GetFromS3
import com.gu.identity.IdentityConfig
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceReads._
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config._
import com.gu.util.zuora.ZuoraRestConfig
import play.api.libs.json.Reads
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class S3ConfigFilesEffectsTest extends AnyFlatSpec with Matchers {

  val PROD = "PROD"
  val CODE = "CODE"

  it should "successfully parse CODE zuora config" taggedAs EffectsTest in {
    validate[ZuoraRestConfig](CODE)
  }

  it should "successfully parse PROD zuora config" taggedAs EffectsTest in {
    validate[ZuoraRestConfig](PROD)
  }

  it should "successfully parse CODE emergency tokens config" taggedAs EffectsTest in {
    validate[EmergencyTokensConfig](CODE)
  }

  it should "successfully parse PROD emergency tokens config" taggedAs EffectsTest in {
    validate[EmergencyTokensConfig](PROD)
  }

  it should "successfully parse CODE Identity config" taggedAs EffectsTest in {
    validate[IdentityConfig](CODE)
  }

  it should "successfully parse PROD Identity config" taggedAs EffectsTest in {
    validate[IdentityConfig](PROD)
  }

  it should "successfully parse CODE Salesforce config" taggedAs EffectsTest in {
    validate[SFAuthConfig](CODE)(SFAuthConfig.location, sfAuthConfigReads)
  }

  it should "successfully parse PROD Salesforce config" taggedAs EffectsTest in {
    validate[SFAuthConfig](PROD)(SFAuthConfig.location, sfAuthConfigReads)
  }

  it should "successfully parse CODE Stripe config" taggedAs EffectsTest in {
    validate[StripeConfig](CODE)
  }

  it should "successfully parse PROD Stripe config" taggedAs EffectsTest in {
    validate[StripeConfig](PROD)
  }

  it should "successfully parse CODE trusted api config" taggedAs EffectsTest in {
    validate[TrustedApiConfig](CODE)
  }

  it should "successfully parse PROD trusted api config" taggedAs EffectsTest in {
    validate[TrustedApiConfig](PROD)
  }

  def wireConfigLoader(stage: String) = LoadConfigModule(Stage(stage), GetFromS3.fetchString)

  val configLoaders = Map(
    PROD -> wireConfigLoader(PROD),
    CODE -> wireConfigLoader(CODE),
  )
  def validate[CONF](stage: String)(implicit loc: ConfigLocation[CONF], r: Reads[CONF]) = {
    val configLoader = configLoaders(stage)
    val config = configLoader[CONF]
    config.isRight shouldBe (true)
  }
}
