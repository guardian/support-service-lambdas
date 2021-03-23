package com.gu.contact_us_api.models

case class ContactUsConfig(clientID: String, clientSecret: String, username: String, password: String, token: String, authEndpoint: String, reqEndpoint: String)

object ContactUsConfig {

  val env: Either[ContactUsError, ContactUsConfig] = {
    (for {
      clientID <- sys.env.get("clientID")
      clientSecret <- sys.env.get("clientSecret")
      username <- sys.env.get("username")
      password <- sys.env.get("password")
      token <- sys.env.get("token")
      authDomain <- sys.env.get("authDomain")
      reqDomain <- sys.env.get("reqDomain")
    } yield ContactUsConfig(
      clientID,
      clientSecret,
      username,
      password,
      token,
      s"https://$authDomain/services/oauth2/token",
      s"https://$reqDomain/services/data/v43.0/composite/",
    )).toRight(ContactUsError("Environment", "Could not obtain all environment variables."))
  }

}
