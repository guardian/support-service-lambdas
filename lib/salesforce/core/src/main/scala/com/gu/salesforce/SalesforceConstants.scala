package com.gu.salesforce

object SalesforceConstants {

  val salesforceApiVersion = "54.0"

  private val sfApiBaseUrl = s"/services/data/v$salesforceApiVersion"

  val soqlQueryBaseUrl: String = s"$sfApiBaseUrl/query/"

  val sfObjectsBaseUrl: String = s"$sfApiBaseUrl/sobjects/"

  val compositeBaseUrl: String = s"$sfApiBaseUrl/composite/"

  val compositeTreeBaseUrl: String = s"${compositeBaseUrl}tree/"

}
