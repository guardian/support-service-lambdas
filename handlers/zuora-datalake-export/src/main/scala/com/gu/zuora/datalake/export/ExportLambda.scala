package com.gu.zuora.datalake.export

import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import io.circe.generic.auto._
import io.circe.parser._
import io.github.mkotsur.aws.handler.Lambda._
import io.github.mkotsur.aws.handler.Lambda
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.typesafe.scalalogging.LazyLogging
import scalaj.http.Http
import scala.io.Source
import scala.concurrent.duration._
import scala.util.Try
import enumeratum._

case class ExportFromDate(exportFromDate: String)
case class Oauth(clientId: String, clientSecret: String)
case class ZuoraDatalakeExport(oauth: Oauth)
case class Config(stage: String, baseUrl: String, zuoraDatalakeExport: ZuoraDatalakeExport)
case class AccessToken(access_token: String)
case class QueryResponse(id: String)
case class Batch(fileId: Option[String], batchId: String, status: String, name: String, message: Option[String], recordCount: Option[Int])
case class JobResults(status: String, id: String, batches: List[Batch], incrementalTime: String)

/**
 * Exports incremental changeset from Zuora to Datalake S3 raw buckets in CSV format via
 * AQuA Stateful API:
 *   - {"exportFromDate": "2019-01-20"} input to lambda will export incremental changes since 2019-01-20
 *   - {"exportFromDate": "yesterday"} input to lambda will export incremental changes since yesterday
 *   - {"exportFromDate": "beginning"} input to lambda will export incremental changes since yesterday
 *   - Export is idempotent, i.e., re-running it will export the same increment
 */
class ExportLambda extends Lambda[ExportFromDate, String] with LazyLogging {
  override def handle(exportFromDate: ExportFromDate, context: Context) = {
    (Preconditions andThen Program andThen Postconditions)(exportFromDate)
  }
}

object Preconditions extends (ExportFromDate => String) {
  def apply(incrementalDate: ExportFromDate): String =
    incrementalDate.exportFromDate.toLowerCase() match {
      case "yesterday" => "yesterday"
      case "beginning" => "beginning"
      case yyyyMMdd =>
        validateDateFormat(yyyyMMdd)
        yyyyMMdd
    }

  private val requiredFormat = "yyyy-MM-dd"
  private def validateDateFormat(incrementalDate: String) = {
    Try(
      LocalDate.parse(incrementalDate, DateTimeFormatter.ofPattern(requiredFormat))
    ).getOrElse(throw new RuntimeException(s"Failed to parse incremental date: $incrementalDate. The format should be $requiredFormat."))
  }
}

object Program extends (String => JobResults) {
  def apply(incrementalDate: String): JobResults = {
    val date = IncrementalDate(incrementalDate)
    val jobId = StartAquaJob(date)
    val jobResult = GetJobResult(jobId)
    jobResult.batches.foreach { batch =>
      val csvFile = GetResultsFile(batch)
      SaveCsvToBucket(csvFile, batch)
    }
    jobResult
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

sealed abstract class Query(val batchName: String, val zoql: String, val s3Bucket: String, val s3Key: String) extends EnumEntry {
  def targetBucket = s"s3://$s3Bucket/$s3Key"
}
object Query extends Enum[Query] {
  val values = findValues

  case object Account extends Query(
    "Account",
    "SELECT Account.Balance,Account.AutoPay,Account.Currency,Account.ID,Account.IdentityId__c,Account.LastInvoiceDate,Account.sfContactId__c,Account.MRR FROM Account WHERE Status != 'Canceled' AND (ProcessingAdvice__c != 'DoNotProcess' OR ProcessingAdvice__c IS NULL)",
    "ophan-raw-zuora-increment-account",
    "Account.csv"
  )
  case object RatePlanCharge extends Query(
    "RatePlanCharge",
    "SELECT Account.ID,RatePlanCharge.EffectiveStartDate,RatePlanCharge.EffectiveEndDate,RatePlanCharge.HolidayStart__c,RatePlanCharge.HolidayEnd__c,RatePlanCharge.ID,RatePlanCharge.MRR,RatePlanCharge.Name,RatePlanCharge.TCV,RatePlanCharge.Version,RatePlanCharge.BillingPeriod,RatePlanCharge.ProcessedThroughDate,RatePlanCharge.ChargedThroughDate,Product.Name,RatePlan.ID,RatePlan.Name,Subscription.ID,ProductRatePlanCharge.BillingPeriod FROM RatePlanCharge WHERE Account.Status != 'Canceled' AND (Account.ProcessingAdvice__c != 'DoNotProcess' OR Account.ProcessingAdvice__c IS NULL)",
    "ophan-raw-zuora-increment-rateplancharge",
    "RatePlanCharge.csv"
  )
  // https://knowledgecenter.zuora.com/CD_Reporting/D_Data_Sources_and_Exports/C_Data_Source_Reference/Rate_Plan_Charge_Tier_Data_Source
  case object RatePlanChargeTier extends Query(
    "RatePlanChargeTier",
    "SELECT RatePlanChargeTier.Price, RatePlanChargeTier.Currency, RatePlanChargeTier.DiscountAmount, RatePlanChargeTier.DiscountPercentage, RatePlanChargeTier.ID, RatePlanCharge.ID, Subscription.ID FROM RatePlanChargeTier",
    "ophan-raw-zuora-increment-rateplanchargetier",
    "RatePlanChargeTier.csv"
  )
  case object RatePlan extends Query(
    "RatePlan",
    "SELECT RatePlan.Name, RatePlan.AmendmentType, RatePlan.CreatedDate, RatePlan.UpdatedDate, RatePlan.ID, Subscription.ID, Product.ID, Amendment.ID, Account.ID FROM RatePlan",
    "ophan-raw-zuora-increment-rateplan",
    "RatePlan.csv"
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
  project: String = "zuora-datalake-export",
  partner: String
)
object ZuoraAquaStatefulApi {
  def apply(): ZuoraAquaStatefulApi = System.getenv("Stage") match {
    case "CODE" => ZuoraAquaStatefulApi(partner = "guardian-12357") // https://support.zuora.com/hc/en-us/requests/175239
    case "PROD" => ZuoraAquaStatefulApi(partner = "GuardianNews4398") // https://support.zuora.com/hc/en-us/requests/177970
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
    val s3Client = AmazonS3Client.builder.build()
    val bucketName = "gu-reader-revenue-private"
    val key = s"membership/support-service-lambdas/$stage/zuoraRest-$stage.v1.json"
    val inputStream = s3Client.getObject(bucketName, key).getObjectContent
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[Config](rawJson) match {
      case Right(oauth) => oauth
      case Left(error) => throw new RuntimeException(s"Could not read secret config file from S3://$bucketName/$key", error)
    }
  }
}

object AccessToken {
  def apply(): String = {
    val config = ReadConfig()
    val oauthConfig = config.zuoraDatalakeExport.oauth
    val response = Http(s"${ZuoraApiHost()}/oauth/token")
      .postForm(Seq(
        "client_id" -> oauthConfig.clientId,
        "client_secret" -> oauthConfig.clientSecret,
        "grant_type" -> "client_credentials"
      ))
      .asString

    response.code match {
      case 200 => decode[AccessToken](response.body).getOrElse(throw new RuntimeException(s"Failed to decode oauth response: ${response}")).access_token
      case _ => throw new RuntimeException(s"Failed to generate oauth token: ${response}")
    }
  }
}

/**
 * Zuora AQuA stateful API will return changed records since IncrementalTime.
 * If the user does not provide manual override date to lambda, then get changes since yesterday.
 * This makes the export idempotent, that is, re-running the lambda number of times within the same day
 * returns the same incremental changeset.
 *
 * Manual date override is useful for fixing failed exports.
 *
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query/e_Post_Query_with_Retrieval_Time
 */
object IncrementalDate {
  def apply(incrementalDate: String): String =
    incrementalDate match {
      case "yesterday" =>
        val yesterday = LocalDate.now.minusDays(1)
        yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))

      case "beginning" => "1970-01-01"

      case particularDate => particularDate
    }
}

/**
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load
 */
object StartAquaJob {
  def apply(incrementalDate: String): String = {
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
        | "incrementalTime": "$incrementalDate 00:00:00",
        |	"queries" :
        |   ${
        Query.values.map { query =>
          s"""
                   |{
                   |	 "name" : "${query.batchName}",
                   |	 "query" : "${query.zoql}",
                   |	 "type" : "zoqlexport",
                   |	 "deleted" : ${DeletedColumn()}
                   |}
                """.stripMargin
        }.mkString("[", ",", "]")
      }
        |}
      """.stripMargin

    val response = Http(s"${ZuoraApiHost()}/v1/batch-query/")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .postData(body)
      .method("POST")
      .asString

    response.code match {
      case 200 => decode[QueryResponse](response.body).getOrElse(throw new RuntimeException(s"Failed to parse Query response: ${response}")).id
      case _ => throw new RuntimeException(s"Failed to start AQuA job: ${response}")
    }

  }
}
/**
 * Poll job status recursively until all queries have completed.
 *
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/C_Get_Job_ID
 */
object GetJobResult {
  def apply(jobId: String): JobResults = {
    val response = Http(s"${ZuoraApiHost()}/v1/batch-query/jobs/$jobId")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .header("Content-Type", "application/json")
      .asString

    response.code match {
      case 200 =>
        val jobResults = decode[JobResults](response.body).getOrElse(throw new RuntimeException(s"Failed to parse GetJobResult response: ${response}"))

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

/**
 * https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/D_Get_File_Download
 */
object GetResultsFile {
  def apply(batch: Batch): String = {
    val fileId = batch.fileId.getOrElse(throw new RuntimeException("Failed to get csv file due to missing fileId"))
    val response = Http(s"${ZuoraApiHost()}/v1/file/$fileId")
      .header("Authorization", s"Bearer ${AccessToken()}")
      .asString

    response.code match {
      case 200 => response.body
      case _ => throw new RuntimeException(s"Failed to execute request GetResultsFile: ${response}")
    }
  }
}

object SaveCsvToBucket {
  def apply(csvContent: String, batch: Batch) = {
    val s3Client = AmazonS3Client.builder.build()
    System.getenv("Stage") match {
      case "CODE" => // do nothing

      case "PROD" =>
        val requestWithAcl = putRequestWithAcl(Query.withName(batch.name).s3Bucket, Query.withName(batch.name).s3Key, csvContent)
        s3Client.putObject(requestWithAcl)
    }
  }

  private def putRequestWithAcl(bucketName: String, key: String, content: String): PutObjectRequest =
    new PutObjectRequest(
      bucketName,
      key,
      new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)),
      new ObjectMetadata()
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)

}
