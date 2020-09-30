package com.gu.contact_us_api

import com.gu.contact_us_api.models.ContactUsEnvConfig

object ContactUsConfig {
  val env: Either[Throwable, ContactUsEnvConfig] = {
    val clientID: Option[String] = sys.env.get("clientID")
    val clientSecret: Option[String] = sys.env.get("clientSecret")
    val username: Option[String] = sys.env.get("username")
    val password: Option[String] = sys.env.get("password")
    val token: Option[String] = sys.env.get("token")
    val authDomain: Option[String] = sys.env.get("authDomain")
    val reqDomain: Option[String] = sys.env.get("reqDomain")

    val envList = List(clientID, clientSecret, username, password, token, authDomain, reqDomain)

    if (envList.size == envList.flatten.size) {
      Left(new Throwable("Unable to obtain environment variables."))
    } else {
      Right(
        ContactUsEnvConfig(
          clientID.getOrElse(""),
          clientSecret.getOrElse(""),
          username.getOrElse(""),
          password.getOrElse(""),
          token.getOrElse(""),
          authDomain.getOrElse("") + "services/oauth2/token",
          reqDomain.getOrElse("") + "services/data/v43.0/composite/",
        )
      )
    }

  }
}
