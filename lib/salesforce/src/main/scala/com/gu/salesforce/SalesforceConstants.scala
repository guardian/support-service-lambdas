package com.gu.salesforce

import com.gu.util.resthttp.RestRequestMaker.RelativePath

object SalesforceConstants {

  val sfApiBaseUrl = "/services/data/v29.0"

  val soqlQueryBaseUrl = RelativePath(sfApiBaseUrl + "/query/")

  val sfObjectsBaseUrl = sfApiBaseUrl + "/sobjects/"

}
