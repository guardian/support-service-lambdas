package com.gu.test
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokensConfig
import com.gu.effects.GetFromS3
import com.gu.identity.{IdentityConfig, IdentityTestUserConfig}
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthTestConfig
import com.gu.util.config._
import com.gu.util.zuora.ZuoraRestConfig
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Reads

class S3ConfigFilesEffectsTest extends FlatSpec with Matchers {

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

  it should "successfully parse CODE ExactTarget config" taggedAs EffectsTest in {
    validate[ETConfig](CODE)
  }

  it should "successfully parse PROD ExactTarget config" taggedAs EffectsTest in {
    validate[ETConfig](PROD)
  }

  it should "successfully parse CODE Salesforce NORMAL config" taggedAs EffectsTest in {
    validate[SFAuthConfig](CODE)(SFAuthConfig.location, SFAuthConfig.reads)
  }

  it should "successfully parse PROD Salesforce NORMAL config" taggedAs EffectsTest in {
    validate[SFAuthConfig](PROD)(SFAuthConfig.location, SFAuthConfig.reads)
  }

  it should "successfully parse CODE Salesforce TEST config" taggedAs EffectsTest in {
    validate[SFAuthConfig](CODE)(SFAuthTestConfig.location, SFAuthTestConfig.reads)
  }

  it should "successfully parse PROD Salesforce TEST config" taggedAs EffectsTest in {
    validate[SFAuthConfig](PROD)(SFAuthTestConfig.location, SFAuthTestConfig.reads)
  }

  it should "successfully parse CODE identity 'test-user' config" taggedAs EffectsTest in {
    validate[IdentityTestUserConfig](CODE)
  }

  it should "successfully parse PROD identity 'test-user' config" taggedAs EffectsTest in {
    validate[IdentityTestUserConfig](PROD)
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
    CODE -> wireConfigLoader(CODE)

  )
  def validate[CONF](stage: String)(implicit loc: ConfigLocation[CONF], r: Reads[CONF]) = {
    val configLoader = configLoaders(stage)
    val config = configLoader[CONF]
    config.isRight shouldBe (true)
  }
}
