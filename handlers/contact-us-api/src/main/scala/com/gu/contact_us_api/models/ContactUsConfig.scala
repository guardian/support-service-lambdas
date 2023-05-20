package com.gu.contact_us_api.models

case class ContactUsConfig(
    authEndpoint: String,
    reqEndpoint: String,
)

object ContactUsConfig {

  val salesforceApiVersion = "54.0"

  val env: Either[ContactUsError, ContactUsConfig] = {
    (for {
      authDomain <- sys.env.get("authDomain")
      reqDomain <- sys.env.get("reqDomain")
    } yield ContactUsConfig(
      s"https://$authDomain/services/oauth2/token",
      s"https://$reqDomain/services/data/v$salesforceApiVersion/composite/",
    )).toRight(ContactUsError("Environment", "Could not obtain all environment variables."))
  }

}
