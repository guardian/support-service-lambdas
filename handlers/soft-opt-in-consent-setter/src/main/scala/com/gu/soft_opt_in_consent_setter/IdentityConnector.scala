package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError

object IdentityConnector {
  def auth() = ???
  
  def sendConsentsReq(indentityId: String, body: String): Either[SoftOptInError, Unit] = ???
}
