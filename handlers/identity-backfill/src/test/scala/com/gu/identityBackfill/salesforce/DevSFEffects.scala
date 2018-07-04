package com.gu.identityBackfill.salesforce

import com.gu.effects.GetFromS3
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import scalaz.\/

object DevSFEffects {
  def apply(s3Load: Stage => ConfigFailure \/ String, response: Request => Response) = {
    for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig].toApiGatewayOp("parse config")
      auth <- SalesforceAuthenticate(response, sfConfig)
    } yield auth
  }
}
