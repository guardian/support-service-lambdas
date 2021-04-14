package com.gu.soft_opt_in_consent_setter

object SfQueries {

  def getAllSubsQuery: String = {
    val limit = 200

    s"""
       |SELECT
       |	Id,
       |	Name,
       |	Product__c,
       |	SF_Status__c,
       |	Soft_Opt_in_Status__c,
       |	Soft_Opt_in_Last_Stage_Processed__c,
       |	Soft_Opt_in_Number_of_Attempts__c,
       |	Buyer__r.IdentityID__c
       |FROM
       |	SF_Subscription__c
       |WHERE
       |	Soft_Opt_in_Status__c in ('Ready to process acquisition','Ready to process cancellation')
       |LIMIT
       |	$limit
    """.stripMargin
  }

  def getActiveSubsQuery(identityIds: Seq[String]): String = {
    val identityIdsAsString = identityIds.mkString("\'", "\',\'", "\'")

      s"""
       |SELECT
       |	buyer__r.identityId__c,
       |	Product__c
       |FROM
       |	SF_Subscription__c
       |WHERE
       |	SF_Status__c in ('Active', 'Voucher Pending', 'Cancellation Pending') AND
       |	Soft_Opt_in_Eligible__c = true AND
       |	buyer__r.identityId__c in  ($identityIdsAsString)
       |GROUP BY
       |	buyer__r.identityId__c, product__c
    """.stripMargin
  }
}
