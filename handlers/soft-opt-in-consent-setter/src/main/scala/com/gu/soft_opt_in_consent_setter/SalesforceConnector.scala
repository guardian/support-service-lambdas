package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInConfig
import io.circe.Error
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions}
class SalesforceConnector(config: SalesforceConfig) {

  case class SfAuthDetails(access_token: String, instance_url: String)

  def getSfAuthDetails(): Either[Object, SfAuthDetails] = {
    for {
      config <- SoftOptInConfig.optConfig
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
    } yield sfAuthDetails
  }

  def getAllSubsQuery(): String = {
    val limit = 2
    val sfSubName = "A-S00121178"
    val query =
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
         |	Soft_Opt_in_Status__c in ('Ready to process acquisition','Ready to process cancellation') AND 
         |	name in ('$sfSubName') 
         |LIMIT 
         |	$limit
  """.stripMargin //, 'A-S00135386'
    query
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    val response =
      Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
        .param("q", query)
        .option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .method("GET")
        .asString
        .body

    println("response:" + response)
    response
  }

  def auth(softOptInConfig: SoftOptInConfig): String = {
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> softOptInConfig.clientId,
          "client_secret" -> softOptInConfig.clientSecret,
          "username" -> softOptInConfig.userName,
          "password" -> s"${softOptInConfig.password}${softOptInConfig.token}"
        )
      )
      .asString
      .body

  }

  def getSubsOverlapCheckQuery(IdentityIds: Seq[String]): String = {
    val identityId = "abc123-1-781"
    val query =
      s"""
         |SELECT
         |	buyer__r.identityId__c,
         |	Product__c
         |FROM 
         |	SF_Subscription__c 
         |WHERE 
         |	SF_Status__c in ('Active', 'Voucher Pending', 'Cancellation Pending') AND 
         |	Soft_Opt_in_Eligible__c = true AND
         |	buyer__r.identityId__c in  ('$identityId')
         |GROUP BY 
         |	buyer__r.identityId__c, product__c
  """.stripMargin
    query
  }

  def doSfCompositeRequest(
      sfAuthDetails: SfAuthDetails,
      jsonBody: String,
      requestType: String
  ): String = {

    val updateResponseFromSf = Http(
      s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects"
    ).header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Content-Type", "application/json")
      .put(jsonBody)
      .method(requestType)
      .asString
      .body

    println("updateResponseFromSf:" + updateResponseFromSf)
    updateResponseFromSf
  }

  def getSfSubs(
      sfAuthentication: SfAuthDetails
  ): Either[Error, SFSubscription.RootInterface] = {

    decode[SFSubscription.RootInterface](
      doSfGetWithQuery(sfAuthentication, getAllSubsQuery())
    )

  }

  case class BodyForWriteBackToSf(
      allOrNone: Boolean = false,
      records: Seq[SFSubscription.UpdateRecord]
  )
}
