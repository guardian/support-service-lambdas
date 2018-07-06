package com.gu.identityBackfill.salesforce

import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}

object DevSFEffects {
  def apply(fetchString: StringFromS3, response: Request => Response) = {
    for {
      sfConfig <- LoadConfigModule(Stage("DEV"), fetchString)[SFAuthConfig].toApiGatewayOp("parse config")
      auth <- SalesforceAuthenticate(response, sfConfig)
    } yield auth
  }
}
