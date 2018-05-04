package com.gu.util.apigateway

import com.gu.util.Logging
import com.gu.util.config.TrustedApiConfig

object Auth extends Logging {

  def credentialsAreValid(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): Boolean =
    requestAuth.exists { requestAuth =>
      requestAuth.apiToken == trustedApiConfig.apiToken
    }

  // Ensure that the correct Zuora environment is hitting the API
  def validTenant(trustedApiConfig: TrustedApiConfig, tenantId: String): Boolean = {
    tenantId == trustedApiConfig.tenantId
  }

}
