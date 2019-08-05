package com.gu.salesforce

object SalesforceConstants {

  private val sfApiBaseUrl = "/services/data/v29.0"

  val soqlQueryBaseUrl: String = sfApiBaseUrl + "/query/"

  val sfObjectsBaseUrl: String = sfApiBaseUrl + "/sobjects/"

  val compositeTreeBaseUrl: String = "/services/data/v38.0/composite/tree/"

}
