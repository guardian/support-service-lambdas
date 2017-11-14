package com.gu.util

import com.gu.effects.Logging
import com.gu.util.apigateway.RequestAuth

object Auth extends Logging {

  def credentialsAreValid(requestAuth: Option[RequestAuth], trustedApiConfig: TrustedApiConfig): Boolean =
    requestAuth.exists { requestAuth =>
      requestAuth.apiClientId == trustedApiConfig.apiClientId &&
        requestAuth.apiToken == trustedApiConfig.apiToken
    }

  // Ensure that the correct Zuora environment is hitting the API
  def validTenant(trustedApiConfig: TrustedApiConfig, tenantId: String): Boolean = {
    tenantId == trustedApiConfig.tenantId
  }

}
