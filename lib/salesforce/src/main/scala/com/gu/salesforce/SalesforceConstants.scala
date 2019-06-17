package com.gu.salesforce

object SalesforceConstants {

  private val sfApiBaseUrl = "/services/data/v29.0"

  val soqlQueryBaseUrl: String = sfApiBaseUrl + "/query/"

  val sfObjectsBaseUrl: String = sfApiBaseUrl + "/sobjects/"

}
