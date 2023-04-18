package com.gu.zuora.datalake.export

import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit.DAYS

import com.amazonaws.services.lambda.runtime.Context
import com.typesafe.scalalogging.LazyLogging
import enumeratum._
import io.circe.Printer
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import scalaj.http.{BaseHttp, HttpOptions}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, ObjectCannedACL, PutObjectRequest}

import scala.concurrent.duration._
import scala.io.Source
import scala.util.Try

/** https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes:
  *
  * In Stateful mode, AQuA establishes a continuous session across a series of requests. AQuA queries are executed in
  * Stateful mode when the version is 1.1 or 1.2, and both Partner and Project are not null. You can specify a
  * combination of Partner and Project as a unique identifier of a continuous AQUA session. Once the Partner and Project
  * pair are supplied in the AQuA input, AQuA records the state of each AQUA call request. The first request executes
  * queries against all data in the database, and returns all data that satisfies the query criteria. Subsequent
  * requests execute the queries against incremental data created or updated since the last AQuA session. Each request
  * returns incremental data for only the object specified in the FROM clauses of the queries; changes made to joined
  * objects are not returned. The Job ID and Transaction Start Date are recorded with the AQuA request. Each subsequent
  * AQuA request with the same Partner ID and Project ID returns the data that satisfies the query criteria created or
  * updated after the Transaction Start Date in the previous AQuA request. Stateful AQuA is best used for continuous
  * data integration between Zuora and a target system. AQuA sessions with the same Tenant ID, Partner ID, and Project
  * ID cannot run in parallel. When this occurs, they are executed sequentially in the order in which they were
  * received. For example, if an AQuA job is running, and another AQuA job with same Tenant ID, Partner ID, and Project
  * ID is submitted, the second job will not be executed until the first job is complete.
  *
  * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query/e_Post_Query_with_Retrieval_Time
  *
  * Allows you to override the time from which a Stateful AQuA job incrementally retrieves records that have been
  * created or modified, using the incrementalTime parameter. For example, if you set incrementalTime = 2015-01-21
  * 10:30:01, AQuA will retrieve records that have created or modified beginning at 10:30:02. If this parameter is not
  * set, AQuA continues to use the Start Time of the last AQuA session to retrieve records incrementally.
  *
  * The incrementalTime field does not support time zones, and it is always handled as in Pacific time zone. If in other
  * time zones, convert the incrementalTime to Pacific time zone and then set the incrementalTime in AQuA request
  * explicitly.
  */

case class ExportFromDate(exportFromDate: String)
case class Oauth(clientId: String, clientSecret: String)
case class ZuoraDatalakeExport(oauth: Oauth)
case class Config(stage: String, baseUrl: String, zuoraDatalakeExport: ZuoraDatalakeExport)
case class AccessToken(access_token: String)
case class QueryResponse(id: String)
case class Batch(
    fileId: Option[String],
    batchId: String,
    status: String,
    name: String,
    message: Option[String],
    recordCount: Option[Int],
)
case class JobResults(status: String, id: String, batches: List[Batch], incrementalTime: Option[String])
case class Metadata(jobId: String, fileId: String, batchId: String, status: String, name: String, recordCount: Int)
object Metadata {
  def apply(job: JobResults, batch: Batch): Metadata = {
    assert(
      batch.fileId.isDefined && batch.recordCount.isDefined,
      s"Batch $batch from job ${job.id} should have file and record count available.",
    )
    Metadata(job.id, batch.fileId.get, batch.batchId, batch.status, batch.name, batch.recordCount.get)
  }
}

/** Exports incremental changeset from Zuora to Datalake S3 raw buckets in CSV format via AQuA Stateful API:
  *   - {"exportFromDate": "2019-01-20"} input to lambda will export incremental changes since 2019-01-20
  *   - {"exportFromDate": "afterLastIncrement"} input to lambda will export incremental changes since last time export
  *     was run
  *   - {"exportFromDate": "beginning"} input to lambda will export incremental changes since beginning of time
  *   - Export is NOT idempotent, i.e., lake must ingest the increment before re-running the export
  */
class ExportLambda extends Lambda[ExportFromDate, String] with LazyLogging {
  override def handle(exportFromDate: ExportFromDate, context: Context) = {
    (Preconditions andThen Program andThen Postconditions)(exportFromDate)
  }
}

object Preconditions extends (ExportFromDate => String) with LazyLogging {
  def apply(incrementalDate: ExportFromDate): String =
    incrementalDate.exportFromDate match {
      case "afterLastIncrement" => "afterLastIncrement"
      case "beginning" =>
        throw new RuntimeException(noFullExportWarning)
        "beginning"
      case yyyyMMdd =>
        validateDateFormat(yyyyMMdd)
        yyyyMMdd
    }

  private val requiredFormat = "yyyy-MM-dd"
  private def validateDateFormat(incrementalDate: String): LocalDate = {
    Try {
      val date = LocalDate.parse(incrementalDate, DateTimeFormatter.ofPattern(requiredFormat))
      if (math.abs(DAYS.between(date, LocalDate.now).toInt) > 30) logger.warn(lambda15minLimitationWarning)
      date
    }.getOrElse(
      throw new RuntimeException(
        s"Failed to parse incremental date: $incrementalDate. The format should be $requiredFormat.",
      ),
    )
  }

  private val noFullExportWarning =
    """
      |Zuora is NOT capable of doing a full export of large objects due to 8 hours limitation on jobs:
      |https://support.zuora.com/hc/en-us/requests/186104
      |Do **NOT** use `{"exportFromDate": "beginning"}` to achieve full export. Lambda will throw an exception if `beginning`
      |input is provided. We did not remove the logic from the code on the off-chance one day Zuora will remove the 8 hour limitation
      |or speed up their exports.
      |""".stripMargin

  private val lambda15minLimitationWarning =
    """
      |Since you are exporting data from 1 month ago or more, Zuora will likely take more than 15 minutes Lambda limit
      |for some objects. For example InvoiceItem monthly chunk is likely to take more than 15 minutes to process.
      |""".stripMargin
}

object Program extends (String => JobResults) {
  def apply(incrementalDate: String): JobResults = {
    val date = IncrementalDate(incrementalDate)
    val jobId = StartAquaJob(date)
    val jobResult = GetJobResult(jobId)
    jobResult.batches.foreach { batch =>
      val csvFile = GetResultsFile(batch)
      SaveCsvToBucket(csvFile, jobResult, batch)
    }
    jobResult
  }
}

/** This app is useful if you want to use local machine to simply copy to ophan data lake an already completed Zuora
  * batch job. Give loads of memory
  *
  * -Xmx8G
  *
  * and set environmental variables
  *
  * STAGE=PROD AWS_REGION=eu-west-1 AWS_ACCESS_KEY_ID=************* AWS_SECRET_ACCESS_KEY=***********
  * AWS_SESSION_TOKEN=*************** AWS_SECURITY_TOKEN=**************
  *
  * and pass Zuora batch jobId
  *
  * runMain com.gu.zuora.datalake.export.Cli jobId
  */
object Cli { // similar to Program but skips StartAquaJob
  def main(arr: Array[String]): Unit = {
    val jobId = arr(0)
    val jobResult = GetJobResult(jobId)
    jobResult.batches.foreach { batch =>
      val csvFile = GetResultsFile(batch)
      println(s"Saving to ophan raw bucket batch: $batch")
      SaveCsvToBucket(csvFile, jobResult, batch)
    }
    Postconditions(jobResult)
  }
}

object Postconditions extends (JobResults => Either[Throwable, String]) with LazyLogging {
  def apply(jobResult: JobResults): Either[Throwable, String] = {
    assert(jobResult.status == "completed", "Job should have completed")
    assert(jobResult.batches.forall(_.status == "completed"), "All queries should have completed successfully")
    jobResult.batches.foreach { batch =>
      val details =
        s"""
           |  Name: ${batch.name}
           |  Change size: ${batch.recordCount}
           |  Changes since: ${jobResult.incrementalTime}
           |  Target S3 bucket: ${Query.withName(batch.name).targetBucket}
           |  Job ID: ${jobResult.id}
           |  File ID: ${batch.fileId}
           |
         """.stripMargin

      logger.info(s"Successfully exported ${batch.name} changes since ${jobResult.incrementalTime}: $details")
    }
    Right(s"Successfully exported Zuora to Datalake jobId = ${jobResult.id}")
  }
}

sealed abstract class Query(val batchName: String, val zoql: String, val s3Bucket: String, val s3Key: String)
    extends EnumEntry {
  def targetBucket = s"s3://$s3Bucket/$s3Key"
}
object Query extends Enum[Query] {
  val values = findValues

  case object Account
      extends Query(
        "Account",
        "SELECT Balance, AutoPay, Currency, ID, IdentityId__c, LastInvoiceDate, sfContactId__c, MRR, CrmId, Status, ProcessingAdvice__c FROM Account",
        "ophan-raw-zuora-increment-account",
        "Account.csv",
      )
  case object RatePlanCharge
      extends Query(
        "RatePlanCharge",
        "SELECT Account.ID, EffectiveStartDate, EffectiveEndDate, HolidayStart__c, HolidayEnd__c, ID, MRR,Name, TCV, Version, BillingPeriod, ProcessedThroughDate, ChargedThroughDate, Product.Name, RatePlan.ID, RatePlan.Name, Subscription.ID, ProductRatePlanCharge.BillingPeriod, AccountingCode, ApplyDiscountTo, BillCycleDay, BillCycleType, BillingPeriodAlignment, BillingTiming, ChargeModel, ChargeNumber, ChargeType, CreatedById, CreatedDate, Description, DiscountLevel, DTCV, ForceSync__c, IsLastSegment, ListPriceBase, NumberofPeriods, OriginalID, OverageCalculationOption, OverageUnusedUnitsCreditOption, PriceChangeOption, PriceIncreasePercentage, Quantity, RatingGroup, RevenueRecognitionRuleName, RevRecCode, RevRecTriggerCondition, Segment, SpecificBillingPeriod, SpecificEndDate, TriggerDate, TriggerEvent, UOM, UpdatedByID, UpdatedDate, UpToPeriods, UpToPeriodsType, WeeklyBillCycleDay, Amendment.ID, BillToContact.ID, DefaultPaymentMethod.ID, ParentAccount.ID, Product.ID, ProductRatePlan.ID, ProductRatePlanCharge.ID, SoldToContact.ID FROM RatePlanCharge",
        "ophan-raw-zuora-increment-rateplancharge",
        "RatePlanCharge.csv",
      )
  // https://knowledgecenter.zuora.com/CD_Reporting/D_Data_Sources_and_Exports/C_Data_Source_Reference/Rate_Plan_Charge_Tier_Data_Source
  case object RatePlanChargeTier
      extends Query(
        "RatePlanChargeTier",
        "SELECT Price, Currency, DiscountAmount, DiscountPercentage, ID, RatePlanCharge.ID, Subscription.ID, CreatedByID, CreatedDate, EndingUnit, IncludedUnits, OveragePrice, PriceFormat, StartingUnit, Tier, UpdatedByID, UpdatedDate, Amendment.Id, Product.Id, ProductRatePlan.Id, ProductRatePlanCharge.Id, RatePlan.Id, Subscription.Name FROM RatePlanChargeTier",
        "ophan-raw-zuora-increment-rateplanchargetier",
        "RatePlanChargeTier.csv",
      )
  case object RatePlan
      extends Query(
        "RatePlan",
        "SELECT Name, AmendmentType, CreatedDate, UpdatedDate, ID, Subscription.ID, Product.ID, Amendment.ID, Account.ID, CreatedByID, UpdatedByID, BillToContact.Id, DefaultPaymentMethod.Id, ParentAccount.Id, ProductRatePlan.Id, SoldToContact.Id, Subscription.Name, SubscriptionVersionAmendment.Id FROM RatePlan",
        "ophan-raw-zuora-increment-rateplan",
        "RatePlan.csv",
      )
  case object Subscription
      extends Query(
        "Subscription",
        "SELECT AutoRenew, CancellationReason__c, ContractAcceptanceDate, ContractEffectiveDate, IPCountry__c, CreatedDate, Name, InitialPromotionCode__c, PromotionCode__c, ReaderType__c, Status, TermEndDate, TermStartDate, Version, serviceActivationDate, ID, BillToContact.ID, SoldToContact.ID, SubscriptionVersionAmendment.ID, Account.ID, AcquisitionCase__c, AcquisitionSource__c, ActivationDate__c, CanadaHandDelivery__c, CancelledDate, CASSubscriberID__c, CreatedByCSR__c, CreatedByID, CreatedRequestId__c, CreatorAccountID, CreatorInvoiceOwnerID, CurrentTerm, CurrentTermPeriodType, Gift_Subscription__c, InitialTerm, InitialTermPeriodType, InvoiceOwnerID, IPAddress__c, IsInvoiceSeparate, LastPriceChangeDate__c, legacy_cat__c, LegacyContractStartDate__c, RedemptionCode__c, GifteeIdentityId__c, GiftRedemptionDate__c, GiftNotificationEmailDate__c FROM Subscription",
        "ophan-raw-zuora-increment-subscription",
        "Subscription.csv",
      )
  case object Contact
      extends Query(
        "Contact",
        "SELECT City, Country, State, PostalCode, Address1, Address2, ID, AccountID FROM Contact",
        "ophan-raw-zuora-increment-contact",
        "Contact.csv",
      )
  case object PaymentMethod
      extends Query(
        "PaymentMethod",
        "SELECT BankTransferType, CreditCardExpirationMonth, CreditCardExpirationYear, LastFailedSaleTransactionDate, LastTransactionDateTime, LastTransactionStatus, Name, NumConsecutiveFailures, PaymentMethodStatus, Type, ID, MandateID, PaypalBAID, SecondTokenID, TokenID, AccountID, Active, Country, CreatedById, CreatedDate, CreditCardType, DeviceSessionId, IdentityNumber, MandateCreationDate, MandateReceived, MandateUpdateDate, MaxConsecutivePaymentFailures, PaymentRetryWindow, TotalNumberOfErrorPayments, TotalNumberOfProcessedPayments, UpdatedById, UpdatedDate, UseDefaultRetryRule FROM PaymentMethod",
        "ophan-raw-zuora-increment-paymentmethod",
        "PaymentMethod.csv",
      )
  case object Amendment
      extends Query(
        "Amendment",
        "SELECT autoRenew, code, createdById, createdDate, currentTerm, currentTermPeriodType, customerAcceptanceDate, description, effectiveDate, id, name, renewalSetting, renewalTerm, renewalTermPeriodType, resumeDate, serviceActivationDate, specificUpdateDate, status, subscriptionId, suspendDate, termStartDate, termType, type, updatedById, updatedDate, contractEffectiveDate FROM Amendment",
        "ophan-raw-zuora-increment-amendment",
        "Amendment.csv",
      )
  case object Invoice
      extends Query(
        "Invoice",
        "SELECT AdjustmentAmount, Amount, AmountWithoutTax, AutoPay, Balance, Comments, CreatedByID, CreatedDate, CreditBalanceAdjustmentAmount, DueDate, IncludesOneTime, IncludesRecurring, IncludesUsage, InvoiceDate, InvoiceNumber, LastEmailSentDate, PaymentAmount, PostedBy, PostedDate, RefundAmount, Source, SourceID, Status, TargetDate, TaxAmount, TaxExemptAmount, TransferredToAccounting, UpdatedByID, UpdatedDate, ID, Account.ID, Reversed, BillToContact.Id, BillToContactSnapShot.Id, DefaultPaymentMethod.Id, ParentAccount.Id, SoldToContact.Id, SoldToContactSnapshot.Id FROM Invoice",
        "ophan-raw-zuora-increment-invoice",
        "Invoice.csv",
      )
  case object Payment
      extends Query(
        "Payment",
        "SELECT EffectiveDate, Amount, Currency, Gateway, GatewayResponse, GatewayResponseCode, GatewayState, Status, SubmittedOn, ID, Account.ID, AccountingCode, AppliedAmount, AppliedCreditBalanceAmount, AuthTransactionId, BankIdentificationNumber, CancelledOn, Comment, CreatedByID, CreatedDate, GatewayOrderID, MarkedForSubmissionOn, PaymentNumber, ReferencedPaymentID, ReferenceID, RefundAmount, SecondPaymentReferenceID, SettledOn, SoftDescriptor, SoftDescriptorPhone, Source, SourceName, TransferredtoAccounting, Type, UnappliedAmount, UpdatedByID, UpdatedDate, BillToContact.Id, DefaultPaymentMethod.Id, ParentAccount.Id, PaymentMethod.Id, PaymentMethodSnapshot.Id, SoldToContact.Id FROM Payment",
        "ophan-raw-zuora-increment-payment",
        "Payment.csv",
      )
  case object InvoicePayment
      extends Query(
        "InvoicePayment",
        "SELECT Amount, CreatedById, CreatedDate, RefundAmount, UpdatedById, UpdatedDate, ID, Payment.ID, Invoice.ID, Account.ID, AccountingPeriod.Id, BillToContact.Id, DefaultPaymentMethod.Id, JournalEntry.Id, JournalRun.Id, ParentAccount.Id, PaymentMethod.Id, PaymentMethodSnapshot.Id, SoldToContact.Id FROM InvoicePayment",
        "ophan-raw-zuora-increment-invoicepayment",
        "InvoicePayment.csv",
      )
  case object Refund
      extends Query(
        "Refund",
        "SELECT AccountingCode, Amount, CancelledOn, Comment, CreatedById, CreatedDate, Gateway, GatewayResponse, GatewayResponseCode, GatewayState, MarkedForSubmissionOn, MethodType, PaymentMethodId, PaymentMethodSnapshot.Id, ReasonCode, ReferenceID, RefundDate, RefundNumber, RefundTransactionTime, SecondRefundReferenceId, SettledOn, SoftDescriptor, SoftDescriptorPhone, SourceType, Status, SubmittedOn, TransferredToAccounting, Type, UpdatedById, UpdatedDate, Id, Account.ID, BillToContact.ID, DefaultPaymentMethod.ID FROM Refund",
        "ophan-raw-zuora-increment-refund",
        "Refund.csv",
      )

  //  FIXME: Zuora is not capable of doing a full export of InvoiceItem hence the WHERE clause: https://support.zuora.com/hc/en-us/requests/186104
  case object InvoiceItem
      extends Query(
        "InvoiceItem",
        "SELECT accountingCode, appliedToInvoiceItemId, chargeAmount, chargeDate, chargeName, createdById, createdDate, invoice.Id, processingType, product.Description, product.Id, product.Name, productRatePlanCharge.Id, quantity, ratePlanCharge.Id, revRecStartDate, serviceEndDate, serviceStartDate, sku, subscriptionId, taxAmount, taxCode, taxExemptAmount, taxMode, unitPrice, uom, updatedById, updatedDate, id, account.Id, balance, accountingPeriod.Id, amendment.Id, billToContact.Id, billToContactSnapShot.Id, defaultPaymentMethod.Id, deferredRevenueAccountingCode.Id, journalEntry.Id, journalRun.Id, parentAccount.Id, productRatePlan.Id, ratePlan.Id, soldToContact.Id FROM InvoiceItem WHERE (CreatedDate >= '2020-04-01T00:00:00') AND (CreatedDate <= '2099-01-01T00:00:00')",
        "ophan-raw-zuora-increment-invoiceitem",
        "InvoiceItem.csv",
      )
}

object ZuoraApiHost {
  def apply(): String = {
    System.getenv("Stage") match {
      case "CODE" => "https://rest.apisandbox.zuora.com"
      case "PROD" => "https://rest.zuora.com"
    }
  }
}

case class ZuoraAquaStatefulApi(
    version: String = "1.2",
    project: String =
      "zuora-datalake-export-2", // Changing this will result in new stateful session which means full load
    partner: String,
)
object ZuoraAquaStatefulApi {
  def apply(): ZuoraAquaStatefulApi = System.getenv("Stage") match {
    case "CODE" =>
      ZuoraAquaStatefulApi(partner = "guardian-12357") // https://support.zuora.com/hc/en-us/requests/175239case
    case "PROD" =>
      ZuoraAquaStatefulApi(partner = "GuardianNews4398") // https://support.zuora.com/hc/en-us/requests/177970
  }
}

object DeletedColumn {
  def apply(): String =
    """
      |{
      |  "column" : "IsDeleted",
      |  "format"  : "Boolean"
      |}
    """.stripMargin
}

object ReadConfig {
  def apply(): Config = {
    val stage = System.getenv("Stage")
    val s3Client = S3Client.create()
    val bucketName = "gu-reader-revenue-private"
    val key = s"membership/support-service-lambdas/$stage/zuoraRest-$stage.v1.json"
    val inputStream = s3Client.getObject(
      GetObjectRequest.builder.bucket(bucketName).key(key).build(),
    )
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[Config](rawJson) match {
      case Right(oauth) => oauth
      case Left(error) =>
        throw new RuntimeException(s"Could not read secret config file from S3://$bucketName/$key", error)
    }
  }
}

object AccessToken {
  def apply(): String = {
    val config = ReadConfig()
    val oauthConfig = config.zuoraDatalakeExport.oauth
    val response = HttpWithLongTimeout(s"${ZuoraApiHost()}/oauth/token")
      .postForm(
        Seq(
          "client_id" -> oauthConfig.clientId,
          "client_secret" -> oauthConfig.clientSecret,
          "grant_type" -> "client_credentials",
        ),
      )
      .asString

    response.code match {
      case 200 =>
        decode[AccessToken](response.body)
          .getOrElse(throw new RuntimeException(s"Failed to decode oauth response: ${response}"))
          .access_token
      case _ => throw new RuntimeException(s"Failed to generate oauth token: ${response}")
    }
  }
}

/** Get all changes since start time of last incremental export job, or since specified incrementalTime
  *
  * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query/e_Post_Query_with_Retrieval_Time
  */
object IncrementalDate {
  def apply(incrementalDate: String): Option[String] =
    incrementalDate match {
      case "afterLastIncrement" => None // Get all changes since last export
      case "beginning" => Some("1970-01-01")
      case particularDate => Some(particularDate)
    }
}

/** https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query
  * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load
  */
object StartAquaJob {
  def apply(incrementalDateMaybe: Option[String]): String = {
    val body =
      s"""
        |{
        |	"format" : "csv",
        |	"version" : "${ZuoraAquaStatefulApi().version}",
        |	"name" : "zuora-datalake-export",
        |	"encrypted" : "none",
        |	"useQueryLabels" : "true",
        |	"dateTimeUtc" : "true",
        |	"partner": "${ZuoraAquaStatefulApi().partner}",
        |	"project": "${ZuoraAquaStatefulApi().project}",
        | ${incrementalDateMaybe
          .map(incrementalDate => s""""incrementalTime": "$incrementalDate 00:00:00",""")
          .getOrElse("")}
        |	"queries" :
        |   ${Query.values
          .map { query =>
            s"""
                   |{
                   |	 "name" : "${query.batchName}",
                   |	 "query" : "${query.zoql}",
                   |	 "type" : "zoqlexport",
                   |	 "deleted" : ${DeletedColumn()}
                   |}
                """.stripMargin
          }
          .mkString("[", ",", "]")}
        |}
      """.stripMargin

    val response = HttpWithLongTimeout(s"${ZuoraApiHost()}/v1/batch-query/")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .postData(body)
      .method("POST")
      .asString

    response.code match {
      case 200 =>
        decode[QueryResponse](response.body)
          .getOrElse(throw new RuntimeException(s"Failed to parse Query response: ${response}"))
          .id
      case _ => throw new RuntimeException(s"Failed to start AQuA job: ${response}")
    }

  }
}

/** Poll job status recursively until all queries have completed.
  *
  * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/C_Get_Job_ID
  */
object GetJobResult {
  def apply(jobId: String): JobResults = {
    val response = HttpWithLongTimeout(s"${ZuoraApiHost()}/v1/batch-query/jobs/$jobId")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .asString

    response.code match {
      case 200 =>
        val jobResults = decode[JobResults](response.body).getOrElse(
          throw new RuntimeException(s"Failed to parse GetJobResult response: ${response}"),
        )

        jobResults.batches.find(_.status == "aborted").map { abortedBatch =>
          throw new RuntimeException(s"Failed to complete query: $abortedBatch")
        }

        if (jobResults.batches.forall(_.status == "completed"))
          jobResults
        else {
          Thread.sleep(1.minute.toMillis)
          apply(jobId) // Keep trying until lambda timeout
        }
      case _ => throw new RuntimeException(s"Failed to execute request GetJobResult: $response")
    }
  }
}

/** https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/D_Get_File_Download
  */
object GetResultsFile {
  def apply(batch: Batch): String = {
    val fileId = batch.fileId.getOrElse(throw new RuntimeException("Failed to get csv file due to missing fileId"))
    val response = HttpWithLongTimeout(s"${ZuoraApiHost()}/v1/file/$fileId")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .asString

    response.code match {
      case 200 =>
        val zuoraRowCount = batch.recordCount.get
        val downloadedLineCount = response.body.lines.toArray.length
        val downloadedRowCount = downloadedLineCount - 1 // for header row
        if (downloadedRowCount != zuoraRowCount) {
          throw new RuntimeException(
            s"HALTING at '${batch.name}' because the row count of downloaded file ($downloadedRowCount) did not match the Zuora row count (${zuoraRowCount})",
          )
        }
        response.body
      case _ => throw new RuntimeException(s"Failed to execute request GetResultsFile: ${response}")
    }
  }
}

object SaveCsvToBucket extends LazyLogging {
  def apply(csvContent: String, job: JobResults, batch: Batch) = {
    val s3Client = S3Client.create()
    System.getenv("Stage") match {
      case "CODE" => // do nothing
      case "PROD" =>
        val bucket = Query.withName(batch.name).s3Bucket
        val metadata: String = Printer.spaces2.print(Metadata(job, batch).asJson)
        val csvRequestWithAcl = putRequestWithAcl(bucket, key = Query.withName(batch.name).s3Key)
        val metadataRequestWithAcl = putRequestWithAcl(bucket, key = s"metadata/${batch.name}.json")
        s3Client.putObject(
          csvRequestWithAcl,
          RequestBody.fromString(csvContent, StandardCharsets.UTF_8),
        )
        logger.info(s"Saving ${batch.name}.json to $bucket with content: $metadata")
        s3Client.putObject(
          metadataRequestWithAcl,
          RequestBody.fromString(metadata, StandardCharsets.UTF_8),
        )
    }
  }

  private def putRequestWithAcl(bucketName: String, key: String): PutObjectRequest =
    PutObjectRequest.builder
      .bucket(bucketName)
      .key(key)
      .acl(ObjectCannedACL.BUCKET_OWNER_READ)
      .build()

}

object HttpWithLongTimeout
    extends BaseHttp(
      options = Seq(
        HttpOptions.connTimeout(5000),
        HttpOptions.readTimeout(5 * 60 * 1000),
        HttpOptions.followRedirects(false),
      ),
    )
