package com.gu.sf_billing_account_remover

import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import scalaj.http._

import scala.util.Try

object BillingAccountRemover extends App {
  //Salesforce
  case class SfAuthDetails(access_token: String, instance_url: String)

  case class SfGetBillingAccsResponse(
    done: Boolean,
    records: Seq[BillingAccountsRecords.Records],
    nextRecordsUrl: Option[String] = None
  )

  case class SfGetCustomSettingResponse(
    done: Boolean,
    records: Seq[CustomSettingRecords.Records]
  )

  case class Attributes(`type`: String)

  case class SfBillingAccountToUpdate(id: String,
                                      GDPR_Removal_Attempts__c: Int,
                                      attributes: Attributes = Attributes(
                                        `type` = "Zuora__CustomerAccount__c"
                                      ))

  case class SfBillingAccountsToUpdate(allOrNone: Boolean,
                                       records: Seq[SfBillingAccountToUpdate])

  case class SfErrorRecordToCreate(Type__c: String,
                                   Info__c: String,
                                   Message__c: String,
                                   attributes: Attributes = Attributes(
                                     `type` = "Apex_Error__c"
                                   ))

  case class SfErrorRecordsToCreate(allOrNone: Boolean,
                                    records: Seq[SfErrorRecordToCreate])

  //Zuora
  case class BillingAccountsForRemoval(CrmId: String = "",
                                       Status: String = "Canceled")
  case class Errors(Code: String, Message: String)
  case class ZuoraResponse(Success: Boolean, Errors: Seq[Errors])

  val optConfig = for {
    sfUserName <- Option(System.getenv("username"))
    sfClientId <- Option(System.getenv("client_id"))
    sfClientSecret <- Option(System.getenv("client_secret"))
    sfPassword <- Option(System.getenv("password"))
    sfToken <- Option(System.getenv("token"))
    sfAuthUrl <- Option(System.getenv("authUrl"))

    zuoraApiAccessKeyId <- Option(System.getenv("apiAccessKeyId"))
    zuoraApiSecretAccessKey <- Option(System.getenv("apiSecretAccessKey"))

  } yield
    Config(
      SalesforceConfig(
        userName = sfUserName,
        clientId = sfClientId,
        clientSecret = sfClientSecret,
        password = sfPassword,
        token = sfToken,
        authUrl = sfAuthUrl
      ),
      ZuoraConfig(
        apiAccessKeyId = zuoraApiAccessKeyId,
        apiSecretAccessKey = zuoraApiSecretAccessKey
      )
    )

  processBillingAccounts()

  def processBillingAccounts(): Unit = {
    for {
      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
      getCustomSettingResponse <- getSfCustomSetting(sfAuthDetails)
      maxAttempts = getCustomSettingResponse.records.headOption
        .getOrElse(
          throw new RuntimeException(
            "There should be at least one record returned for MaxAttempts"
          )
        )
        .Property_Value__c
      getBillingAccountsResponse <- getSfBillingAccounts(
        maxAttempts,
        sfAuthDetails
      )
    } {
      val sfRecords = getBillingAccountsResponse.records

      val allUpdates = updateRecordsInZuora(sfRecords)
      val failedUpdates = allUpdates.filter(_.ErrorCode.isDefined)

      if (failedUpdates.nonEmpty) {
        updateBillingAccountsInSf(sfAuthDetails, failedUpdates)
        insertErrorRecordsInSf(sfAuthDetails, failedUpdates)
      }
    }
  }

  def getSfBillingAccounts(
    maxAttempts: Int,
    sfAuthentication: SfAuthDetails
  ): Either[Error, SfGetBillingAccsResponse] = {

    //can we bring this into a one liner and remove the method?
    decode[SfGetBillingAccsResponse](
      getBillingAccountsFromSf(maxAttempts, sfAuthentication)
    )
  }
  def getSfCustomSetting(
    sfAuthentication: SfAuthDetails
  ): Either[Error, SfGetCustomSettingResponse] = {

    val customSettingFromSf =
      getMaxAttemptsCustomSetting(sfAuthentication)
    println("customSettingFromSf:" + customSettingFromSf)
    val decodedCustomSetting = decode[SfGetCustomSettingResponse](
      customSettingFromSf
    ) map { customSettingObject =>
      customSettingObject
    }

    decodedCustomSetting
  }

  def updateRecordsInZuora(
    recordsForUpdate: Seq[BillingAccountsRecords.Records]
  ): Seq[BillingAccountsRecords.Records] = {

    for {
      billingAccount <- recordsForUpdate
      zuoraCancellationResponses <- updateBillingAccountInZuora(billingAccount)
    } yield zuoraCancellationResponses

  }

  def updateBillingAccountsInSf(
    sfAuthDetails: SfAuthDetails,
    recordsToUpdate: Seq[BillingAccountsRecords.Records]
  ): Either[Throwable, String] = {

    val sfBillingAccUpdateJson = SfUpdateBillingAccounts(recordsToUpdate).asJson.spaces2
    updateSfBillingAccs(sfAuthDetails, sfBillingAccUpdateJson)

  }

  def insertErrorRecordsInSf(
    sfAuthDetails: SfAuthDetails,
    recordsToUpdate: Seq[BillingAccountsRecords.Records]
  ): Either[Throwable, String] = {

    val sfErrorRecordInsertJson = SfCreateErrorRecords(recordsToUpdate).asJson.spaces2
    insertSfErrorRecs(sfAuthDetails, sfErrorRecordInsertJson)

  }

  def updateBillingAccountInZuora(
    accountToDelete: BillingAccountsRecords.Records
  ): Option[BillingAccountsRecords.Records] = {

    val response =
      updateZuoraBillingAcc(
        BillingAccountsForRemoval().asJson.spaces2,
        accountToDelete.Zuora__External_Id__c
      )

    val parsedResponse = decode[ZuoraResponse](response)

    parsedResponse match {
      case Right(dr) =>
        if (dr.Success) {
          None
        } else {
          Some(
            accountToDelete.copy(
              ErrorCode = Some(dr.Errors(0).Code),
              ErrorMessage = Some(dr.Errors(0).Message)
            )
          )
        }
      case Left(ex) => {
        Some(accountToDelete.copy(ErrorMessage = Some(ex.toString)))
      }
    }

  }

  def insertSfErrorRecs(sfAuthDetails: SfAuthDetails,
                        jsonBody: String): Either[Throwable, String] = {

    Try {
      Http(
        s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects"
      ).header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .put(jsonBody)
        .method("POST")
        .asString
        .body
    }.toEither
  }

  def updateSfBillingAccs(sfAuthDetails: SfAuthDetails,
                          jsonBody: String): Either[Throwable, String] = {

    val response =
      try {
        Right(
          Http(
            s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects"
          ).header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
            .header("Content-Type", "application/json")
            .put(jsonBody)
            .method("PATCH")
            .asString
            .body
        )
      } catch {
        case ex: Throwable => { Left(ex) }
      }
    response
  }

  def updateZuoraBillingAcc(billingAccountForRemovalAsJson: String,
                            zuoraBillingAccountId: String) = {
    Http(
      s"https://rest.apisandbox.zuora.com/v1/object/account/$zuoraBillingAccountId"
    ).header("apiAccessKeyId", System.getenv("apiAccessKeyId"))
      .option(HttpOptions.readTimeout(30000))
      .header("apiSecretAccessKey", System.getenv("apiSecretAccessKey"))
      .header("Content-Type", "application/json")
      .put(billingAccountForRemovalAsJson)
      .asString
      .body
  }

  def parseBillingAccountsFromSf(
    billingAccountList: String
  ): Either[Exception, Seq[BillingAccountsRecords.Records]] =
    decode[SfGetBillingAccsResponse](billingAccountList) map {
      billingAccountsObject =>
        billingAccountsObject.records
    }

  def getBillingAccountsFromSf(maxAttempts: Int,
                               sfAuthDetails: SfAuthDetails): String = {
    val limit = 5;
    val devQuery =
      s"Select Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c from Zuora__CustomerAccount__c where Name like '%Bill-Acc-Remover-ctc%' and createddate>=2020-09-17T09:17:45.000+0000 order by Name limit $limit"

    //val prodQuery =
    s"Select Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c from Zuora__CustomerAccount__c where Zuora__External_Id__c != null AND Account.GDPR_Billing_Accounts_Ready_for_Removal__c = true AND GDPR_Removal_Attempts__c < $maxAttempts limit $limit"

    val query = devQuery

    Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def getMaxAttemptsCustomSetting(sfAuthDetails: SfAuthDetails): String = {
    val query: String =
      "Select Id, Property_Value__c from Touch_Point_List_Property__c where name = 'Max Billing Acc GDPR Removal Attempts'"
    Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def auth(salesforceConfig: SalesforceConfig): String = {
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> salesforceConfig.clientId,
          "client_secret" -> salesforceConfig.clientSecret,
          "username" -> salesforceConfig.userName,
          "password" -> s"${salesforceConfig.password}${salesforceConfig.token}"
        )
      )
      .asString
      .body

  }

  object SfUpdateBillingAccounts {
    def apply(
      recordList: Seq[BillingAccountsRecords.Records]
    ): SfBillingAccountsToUpdate = {

      val recordListWithincrementedGDPRAttempts =
        recordList.map(
          a => a.copy(GDPR_Removal_Attempts__c = a.GDPR_Removal_Attempts__c + 1)
        )

      val sfBillingAccounts = recordListWithincrementedGDPRAttempts
        .map(a => SfBillingAccountToUpdate(a.Id, a.GDPR_Removal_Attempts__c))
        .toSeq

      SfBillingAccountsToUpdate(false, sfBillingAccounts)
    }
  }

  object SfCreateErrorRecords {
    def apply(
      recordList: Seq[BillingAccountsRecords.Records]
    ): SfErrorRecordsToCreate = {
      val sfErrorRecords = recordList
        .map(
          a =>
            SfErrorRecordToCreate(
              Type__c = a.ErrorCode.get,
              Info__c = "Billing Account Id:" + a.Id,
              Message__c = a.ErrorMessage.get
          )
        )
        .toSeq

      SfErrorRecordsToCreate(false, sfErrorRecords)
    }
  }
}
