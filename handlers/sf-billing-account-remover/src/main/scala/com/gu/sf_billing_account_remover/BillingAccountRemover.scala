package com.gu.sf_billing_account_remover

import java.time.LocalDateTime
import com.typesafe.scalalogging.LazyLogging
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import scalaj.http._

import scala.util.Try

object BillingAccountRemover extends App with LazyLogging {
  
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

  case class SfBillingAccountToUpdate(
    id: String,
    GDPR_Removal_Attempts__c: Int,
    GDPR_Date_Last_Removal_Attempt__c: LocalDateTime = LocalDateTime.now(),
    attributes: Attributes = Attributes(`type` = "Zuora__CustomerAccount__c")
  )

  case class SfBillingAccountsToUpdate(
    allOrNone: Boolean,
    records: Seq[SfBillingAccountToUpdate]
  )

  case class SfErrorRecordToCreate(
    Type__c: String,
    Info__c: String,
    Message__c: String,
    attributes: Attributes = Attributes(
      `type` = "Apex_Error__c"
    )
  )

  case class SfErrorRecordsToCreate(
    allOrNone: Boolean,
    records: Seq[SfErrorRecordToCreate]
  )

  //Zuora
  case class BillingAccountsForRemoval(
    CrmId: String = "",
    Status: String = "Canceled"
  )
  case class Errors(Code: String, Message: String)
  case class ZuoraResponse(Success: Boolean, Errors: Seq[Errors])

  lazy val optConfig = for {
    sfUserName <- Option(System.getenv("username"))
    sfClientId <- Option(System.getenv("clientId"))
    sfClientSecret <- Option(System.getenv("clientSecret"))
    sfPassword <- Option(System.getenv("password"))
    sfToken <- Option(System.getenv("token"))
    sfAuthUrl <- Option(System.getenv("authUrl"))

    zuoraApiAccessKeyId <- Option(System.getenv("apiAccessKeyId"))
    zuoraApiSecretAccessKey <- Option(System.getenv("apiSecretAccessKey"))
    zuoraInstanceUrl <- Option(System.getenv("zuoraInstanceUrl"))

  } yield Config(
    SalesforceConfig(
      username = sfUserName,
      clientId = sfClientId,
      clientSecret = sfClientSecret,
      password = sfPassword,
      token = sfToken,
      authUrl = sfAuthUrl
    ),
    ZuoraConfig(
      apiAccessKeyId = zuoraApiAccessKeyId,
      apiSecretAccessKey = zuoraApiSecretAccessKey,
      zuoraInstanceUrl = zuoraInstanceUrl
    )
  )
  processBillingAccounts()

  def processBillingAccounts(): Unit = {

    (for {
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
    } yield {
      val sfRecords = getBillingAccountsResponse.records
      logger.info(s"Retrieved ${sfRecords.length} records from Salesforce.")

      val allUpdates = updateRecordsInZuora(config.zuoraConfig, sfRecords)

      val failedUpdates = allUpdates.filter(_.ErrorCode.isDefined)

      if (failedUpdates.nonEmpty) {
        writeErrorsBackToSf(sfAuthDetails, failedUpdates)
      }
    }).left
      .foreach(e => throw new RuntimeException("An error occurred: ", e))
  }

  def auth(salesforceConfig: SalesforceConfig): String = {
    logger.info("Authenticating with Salesforce...")
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> salesforceConfig.clientId,
          "client_secret" -> salesforceConfig.clientSecret,
          "username" -> salesforceConfig.username,
          "password" -> s"${salesforceConfig.password}${salesforceConfig.token}"
        )
      )
      .asString
      .body

  }

  def getSfCustomSetting(
    sfAuthentication: SfAuthDetails
  ): Either[Error, SfGetCustomSettingResponse] = {
    logger.info("Getting GDPR Max Number of Removal Attempts Custom Setting value from Salesforce...")

    val query =
      "Select Id, Property_Value__c from Touch_Point_List_Property__c where name = 'Max Billing Acc GDPR Removal Attempts'"

    decode[SfGetCustomSettingResponse](
      doSfGetWithQuery(sfAuthentication, query)
    )
  }

  def getSfBillingAccounts(
    maxAttempts: Int,
    sfAuthentication: SfAuthDetails
  ): Either[Error, SfGetBillingAccsResponse] = {
    logger.info("Getting Billing Accounts from Salesforce...")

    val limit = 200;

    val query =
      s"Select Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c from Zuora__CustomerAccount__c where Zuora__External_Id__c != null AND Zuora__Account__r.GDPR_Billing_Accounts_Ready_for_Removal__c = true AND GDPR_Removal_Attempts__c < $maxAttempts limit $limit"

    decode[SfGetBillingAccsResponse](doSfGetWithQuery(sfAuthentication, query))
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v54.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def doSfCompositeRequest(
    sfAuthDetails: SfAuthDetails,
    jsonBody: String,
    requestType: String
  ): Either[Throwable, String] = {

    Try {
      Http(
        s"${sfAuthDetails.instance_url}/services/data/v54.0/composite/sobjects"
      ).header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .put(jsonBody)
        .method(requestType)
        .asString
        .body
    }.toEither
  }

  def parseBillingAccountsFromSf(
    billingAccountList: String
  ): Either[Exception, Seq[BillingAccountsRecords.Records]] =
    decode[SfGetBillingAccsResponse](billingAccountList) map {
      billingAccountsObject =>
        billingAccountsObject.records
    }

  def updateRecordsInZuora(
    zuoraConfig: ZuoraConfig,
    recordsForUpdate: Seq[BillingAccountsRecords.Records]
  ): Seq[BillingAccountsRecords.Records] = {

    logger.info(s"Removing crm Id from ${recordsForUpdate.length} records in Zuora...")
    logger.info(s"recordsForUpdate in Zuora: ${recordsForUpdate}")

    for {
      billingAccount <- recordsForUpdate
      zuoraCancellationResponses <- updateBillingAccountInZuora(
        zuoraConfig,
        billingAccount
      )
    } yield zuoraCancellationResponses

  }

  def updateBillingAccountInZuora(
    zuoraConfig: ZuoraConfig,
    accountToDelete: BillingAccountsRecords.Records
  ): Option[BillingAccountsRecords.Records] = {
    logger.info(
      s"Updating Billing Account in Zuora (${accountToDelete.Zuora__External_Id__c})"
    )

    val response =
      updateZuoraBillingAcc(
        zuoraConfig,
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

  def updateZuoraBillingAcc(
    zuoraConfig: ZuoraConfig,
    billingAccountForRemovalAsJson: String,
    zuoraBillingAccountId: String
  ) = {
    Http(
      s"${zuoraConfig.zuoraInstanceUrl}/v1/object/account/$zuoraBillingAccountId"
    ).header("apiAccessKeyId", zuoraConfig.apiAccessKeyId)
      .header("apiSecretAccessKey", zuoraConfig.apiSecretAccessKey)
      .header("Content-Type", "application/json")
      .option(HttpOptions.readTimeout(30000))
      .put(billingAccountForRemovalAsJson)
      .asString
      .body
  }

  def writeErrorsBackToSf(
    sfAuthDetails: SfAuthDetails,
    failedUpdates: Seq[BillingAccountsRecords.Records]
  ): Unit = {
    logger.info(s"Writing ${failedUpdates.length} errors back to Salesforce...")
    logger.info(s"failedUpdates: ${failedUpdates}")

    (for {
      _ <- updateBillingAccountsInSf(sfAuthDetails, failedUpdates)
      _ <- insertErrorRecordsInSf(sfAuthDetails, failedUpdates)
    } yield ()).left.foreach(e => throw e)

  }

  def updateBillingAccountsInSf(
    sfAuthDetails: SfAuthDetails,
    recordsToUpdate: Seq[BillingAccountsRecords.Records]
  ): Either[Throwable, String] = {
    logger.info(
      "Updating GDPR_Removal_Attempts__c on Billing Accounts in Salesforce..."
    )

    val sfBillingAccUpdateJson = SfUpdateBillingAccounts(recordsToUpdate).asJson.spaces2
    doSfCompositeRequest(sfAuthDetails, sfBillingAccUpdateJson, "PATCH")

  }

  def insertErrorRecordsInSf(
    sfAuthDetails: SfAuthDetails,
    recordsToUpdate: Seq[BillingAccountsRecords.Records]
  ): Either[Throwable, String] = {
    logger.info("Inserting Apex Errors in Salesforce...")

    val sfErrorRecordInsertJson = SfCreateErrorRecords(recordsToUpdate).asJson.spaces2
    doSfCompositeRequest(sfAuthDetails, sfErrorRecordInsertJson, "POST")
  }

  object SfUpdateBillingAccounts {
    def apply(
      recordList: Seq[BillingAccountsRecords.Records]
    ): SfBillingAccountsToUpdate = {

      val recordListWithIncrementedGDPRAttempts =
        recordList.map(
          a => a.copy(GDPR_Removal_Attempts__c = a.GDPR_Removal_Attempts__c + 1)
        )

      val sfBillingAccounts = recordListWithIncrementedGDPRAttempts
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

  def lambda(): Unit = {
    processBillingAccounts()
  }
}
