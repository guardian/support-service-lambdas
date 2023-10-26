package com.gu.singleContributionSalesforceWrites.services.salesforce

object GetApiDomain {
  def apply(stage: String) = {
    stage match {
      case "PROD" => "https://gnmtouchpoint.my.salesforce.com"
      case _ => "https://gnmtouchpoint--dev1.sandbox.my.salesforce.com"
    }
  }
}
