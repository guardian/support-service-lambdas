package com.gu.zuora.rer

import com.gu.util.config.ConfigLocation
import com.gu.util.zuora.ZuoraRestConfig
import play.api.libs.json.Json

case class BatonZuoraUser(loginName: String, password: String)

case class BatonZuoraConfig(user: BatonZuoraUser)

/* hybrid (and hopefully temporary) config allowing us to use a specific user for the baton zuora lambdas
typically these sub-configs are used for oauth config (see `zuora-core` lib), but the `zuora` rest lib doesn't yet
support oauth, so we will use the login name and password from the sub-config.
e.g.
{
  "stage": "CODE",
  "baseUrl": "https://rest.apisandbox.zuora.com/v1",
  "username": "blah",         <- don't use these details
  "password": "blah"
  "batonZuora": {             <- specific config for these lambdas
    "user": {
      "loginName": "blah",    <- use these details
      "password": "blah"
    },
    "oauth": {
      "clientId": "blah",
      "clientSecret": "blah"
    }
  },

 */
case class BatonZuoraRestConfig(
  baseUrl: String,
  batonZuora: BatonZuoraConfig
)

object BatonZuoraRestConfig {
  implicit val userReads = Json.reads[BatonZuoraUser]
  implicit val configReads = Json.reads[BatonZuoraConfig]
  implicit val restConfigReads = Json.reads[BatonZuoraRestConfig]
  implicit val location = ConfigLocation[BatonZuoraRestConfig](path = "zuoraRest", version = 1)

  // convert to flat config that zuora rest lib requires
  def toZuoraRestConfig(config: BatonZuoraRestConfig) =
    ZuoraRestConfig(config.baseUrl, config.batonZuora.user.loginName, config.batonZuora.user.password)
}
