package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker
import okhttp3.{Request, Response}
import scalaz.\/-

object SalesforceRestRequestMaker extends Logging {

  def apply(salesforceAuth: SalesforceAuth, response: Request => Response): RestRequestMaker.Requests = {
    new RestRequestMaker.Requests(
      Map(
        "Authorization" -> s"Bearer ${salesforceAuth.access_token}"
      ),
      salesforceAuth.instance_url,
      response,
      _ => \/-(())
    )
  }

}

