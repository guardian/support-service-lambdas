package com.gu.paymentFailure

import java.nio.charset.Charset
import java.util.Base64

import com.gu.autoCancel.Logging
import play.api.libs.json.JsValue

object Auth extends Logging {

  def credentialsAreValid(inputEvent: JsValue, trustedUserName: String, trustedPassword: String): Boolean = {
    val AuthorizationHeader = (inputEvent \ "headers" \ "Authorization").asOpt[String]
    val result = AuthorizationHeader.filter(_.startsWith("Basic")).map { headerValue =>
      val encodedData = headerValue.drop(6)
      val credentials = new String(Base64.getDecoder.decode(encodedData), Charset.forName("UTF-8"))
      val credentialParts = credentials.split(":")
      if (credentialParts.length >= 2) {
        credentialParts(0) == trustedUserName && credentialParts(1) == trustedPassword
      } else {
        logger.info(s"invalid format for Authorization header")
        false
      }
    }
    result.getOrElse {
      logger.info(s"Could not find credentials in request")
      false
    }
  }

}
